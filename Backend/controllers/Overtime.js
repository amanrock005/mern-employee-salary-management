import { Op, Sequelize } from "sequelize";
import DataPegawai from "../models/DataPegawaiModel.js";
import Overtime from "../models/OvertimeModel.js";

const MAX_DAILY_OT_HOURS = 6;
const MIN_DAILY_OT_HOURS = 1;
const MAX_LATE_DAYS = 7;
const MAX_MONTHLY_OT_HOURS = 60;

function isValidDateOnlyString(value) {
  // DATEONLY in Sequelize expects YYYY-MM-DD
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetweenLocalDays(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a0 = startOfLocalDay(a).getTime();
  const b0 = startOfLocalDay(b).getTime();
  return Math.round((b0 - a0) / msPerDay);
}

export const createOvertimeEntry = async (req, res) => {
  const { nik, tanggal, jam_lembur, alasan } = req.body;

  // Required fields
  if (!nik || !tanggal || jam_lembur === undefined || jam_lembur === null || !alasan) {
    return res.status(400).json({ msg: "Semua field wajib diisi" });
  }

  if (!isValidDateOnlyString(tanggal)) {
    return res.status(400).json({ msg: "Tanggal tidak valid (format harus YYYY-MM-DD)" });
  }

  const hours = Number(jam_lembur);
  if (!Number.isFinite(hours) || !Number.isInteger(hours)) {
    return res.status(400).json({ msg: "Jam lembur harus berupa angka bulat" });
  }
  if (hours < MIN_DAILY_OT_HOURS || hours > MAX_DAILY_OT_HOURS) {
    return res
      .status(400)
      .json({ msg: `Jam lembur harus antara ${MIN_DAILY_OT_HOURS} dan ${MAX_DAILY_OT_HOURS}` });
  }

  const reason = String(alasan).trim();
  if (reason.length < 10) {
    return res.status(400).json({ msg: "Alasan minimal 10 karakter" });
  }

  const entryDate = new Date(`${tanggal}T00:00:00`);
  if (Number.isNaN(entryDate.getTime())) {
    return res.status(400).json({ msg: "Tanggal tidak valid" });
  }

  const today = new Date();
  const diffDays = daysBetweenLocalDays(entryDate, today);
  if (diffDays < 0) {
    return res.status(400).json({ msg: "Tanggal tidak boleh di masa depan" });
  }
  if (diffDays > MAX_LATE_DAYS) {
    return res.status(400).json({ msg: `Tanggal tidak boleh lebih dari ${MAX_LATE_DAYS} hari yang lalu` });
  }

  try {
    // Worker must exist
    const worker = await DataPegawai.findOne({
      where: { nik: nik },
      attributes: ["nik", "nama_pegawai"],
    });
    if (!worker) {
      return res.status(404).json({ msg: "Data pegawai tidak ditemukan" });
    }

    // No duplicates for same worker+date
    const duplicate = await Overtime.findOne({
      where: { nik: nik, tanggal: tanggal },
      attributes: ["id"],
    });
    if (duplicate) {
      return res.status(409).json({ msg: "Entri lembur untuk pegawai dan tanggal tersebut sudah ada" });
    }

    // Monthly cap: sum existing hours in the same month + new entry must be <= 60
    const year = entryDate.getFullYear();
    const month = entryDate.getMonth(); // 0-based
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); // last day of month

    const existingMonthlyHours = await Overtime.findOne({
      where: {
        nik: nik,
        tanggal: {
          [Op.between]: [
            monthStart.toISOString().slice(0, 10),
            monthEnd.toISOString().slice(0, 10),
          ],
        },
      },
      attributes: [[Sequelize.fn("COALESCE", Sequelize.fn("SUM", Sequelize.col("jam_lembur")), 0), "total"]],
      raw: true,
    });

    const currentTotal = Number(existingMonthlyHours?.total ?? 0);
    if (currentTotal + hours > MAX_MONTHLY_OT_HOURS) {
      return res.status(400).json({
        msg: `Total lembur bulanan melebihi batas ${MAX_MONTHLY_OT_HOURS} jam`,
      });
    }

    const created = await Overtime.create({
      nik: nik,
      nama_pegawai: worker.nama_pegawai,
      tanggal: tanggal,
      jam_lembur: hours,
      alasan: reason,
      status: "submitted",
    });

    return res.status(201).json({
      msg: "Entri lembur berhasil disimpan dan dikirim untuk proses payroll",
      data: created,
    });
  } catch (error) {
    // Handle unique index race condition nicely
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ msg: "Entri lembur untuk pegawai dan tanggal tersebut sudah ada" });
    }
    return res.status(500).json({ msg: error.message });
  }
};

