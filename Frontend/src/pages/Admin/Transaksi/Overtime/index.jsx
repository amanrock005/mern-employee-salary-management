import { useEffect, useMemo, useState } from "react";
import Layout from "../../../../layout";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Breadcrumb, ButtonOne } from "../../../../components";
import { getMe } from "../../../../config/redux/action";

const API_URL = "http://localhost:5000";

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetweenLocalDays(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfLocalDay(b) - startOfLocalDay(a)) / msPerDay);
}

function validateOvertimeForm({ nik, tanggal, jam_lembur, alasan }) {
  const errors = {};

  if (!nik) errors.nik = "Pilih pegawai";
  if (!tanggal) errors.tanggal = "Tanggal wajib diisi";
  if (jam_lembur === "" || jam_lembur === null || jam_lembur === undefined) {
    errors.jam_lembur = "Jam lembur wajib diisi";
  }
  if (!alasan || String(alasan).trim().length === 0) errors.alasan = "Alasan wajib diisi";

  const reason = String(alasan ?? "").trim();
  if (reason && reason.length < 10) errors.alasan = "Alasan minimal 10 karakter";

  const hours = Number(jam_lembur);
  if (jam_lembur !== "" && (Number.isNaN(hours) || !Number.isFinite(hours))) {
    errors.jam_lembur = "Jam lembur harus berupa angka";
  } else if (Number.isFinite(hours)) {
    if (!Number.isInteger(hours)) errors.jam_lembur = "Jam lembur harus bilangan bulat";
    else if (hours < 1 || hours > 6) errors.jam_lembur = "Jam lembur harus antara 1 sampai 6";
  }

  if (tanggal) {
    const entryDate = new Date(`${tanggal}T00:00:00`);
    if (Number.isNaN(entryDate.getTime())) {
      errors.tanggal = "Tanggal tidak valid";
    } else {
      const today = new Date();
      const diffDays = daysBetweenLocalDays(entryDate, today);
      if (diffDays < 0) errors.tanggal = "Tanggal tidak boleh di masa depan";
      else if (diffDays > 7) errors.tanggal = "Tanggal tidak boleh lebih dari 7 hari yang lalu";
    }
  }

  return errors;
}

const Overtime = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isError, user } = useSelector((state) => state.auth);

  const [dataPegawai, setDataPegawai] = useState([]);
  const [nik, setNik] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jamLembur, setJamLembur] = useState("");
  const [alasan, setAlasan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  const errors = useMemo(
    () =>
      validateOvertimeForm({
        nik,
        tanggal,
        jam_lembur: jamLembur,
        alasan,
      }),
    [nik, tanggal, jamLembur, alasan]
  );

  const isValid = Object.keys(errors).length === 0;

  const fetchDataPegawai = async () => {
    const response = await axios.get(`${API_URL}/data_pegawai`);
    setDataPegawai(response.data ?? []);
  };

  const selectedPegawai = useMemo(
    () => dataPegawai.find((p) => p.nik === nik),
    [dataPegawai, nik]
  );

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ nik: true, tanggal: true, jam_lembur: true, alasan: true });

    const finalErrors = validateOvertimeForm({
      nik,
      tanggal,
      jam_lembur: jamLembur,
      alasan,
    });
    if (Object.keys(finalErrors).length > 0) return;

    try {
      setSubmitting(true);
      await axios.post(`${API_URL}/overtime`, {
        nik,
        tanggal,
        jam_lembur: Number(jamLembur),
        alasan: String(alasan).trim(),
      });

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Entri lembur berhasil dikirim untuk proses payroll",
        showConfirmButton: false,
        timer: 1500,
      });

      setNik("");
      setTanggal("");
      setJamLembur("");
      setAlasan("");
      setTouched({});
    } catch (error) {
      const msg = error?.response?.data?.msg || error?.message || "Terjadi kesalahan";
      Swal.fire({
        title: "Validasi Gagal",
        text: msg,
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDataPegawai();
  }, []);

  useEffect(() => {
    dispatch(getMe());
  }, [dispatch]);

  useEffect(() => {
    if (isError) navigate("/login");
    if (user && user.hak_akses !== "admin") navigate("/dashboard");
  }, [isError, user, navigate]);

  return (
    <Layout>
      <Breadcrumb pageName="Input Lembur Pegawai" />

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 mt-6">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div>
            <label className="mb-2.5 block font-medium text-black dark:text-white">
              Pegawai
            </label>
            <select
              value={nik}
              onBlur={() => setTouched((t) => ({ ...t, nik: true }))}
              onChange={(e) => setNik(e.target.value)}
              className="w-full rounded border border-stroke bg-transparent py-3 px-4 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input"
            >
              <option value="">Pilih Pegawai</option>
              {dataPegawai.map((p) => (
                <option key={p.id} value={p.nik}>
                  {p.nama_pegawai} ({p.nik})
                </option>
              ))}
            </select>
            {touched.nik && errors.nik && (
              <p className="mt-1 text-sm text-danger">{errors.nik}</p>
            )}
            {selectedPegawai && (
              <p className="mt-2 text-sm text-gray-5 dark:text-gray-4">
                Jabatan: <span className="font-medium">{selectedPegawai.jabatan}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Tanggal
              </label>
              <input
                type="date"
                value={tanggal}
                onBlur={() => setTouched((t) => ({ ...t, tanggal: true }))}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full rounded border border-stroke bg-transparent py-3 px-4 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input"
              />
              {touched.tanggal && errors.tanggal && (
                <p className="mt-1 text-sm text-danger">{errors.tanggal}</p>
              )}
            </div>

            <div>
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Jam Lembur
              </label>
              <input
                type="number"
                min="1"
                max="6"
                step="1"
                value={jamLembur}
                onBlur={() => setTouched((t) => ({ ...t, jam_lembur: true }))}
                onChange={(e) => setJamLembur(e.target.value)}
                placeholder="1 - 6"
                className="w-full rounded border border-stroke bg-transparent py-3 px-4 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input"
              />
              {touched.jam_lembur && errors.jam_lembur && (
                <p className="mt-1 text-sm text-danger">{errors.jam_lembur}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2.5 block font-medium text-black dark:text-white">
              Alasan
            </label>
            <textarea
              rows={4}
              value={alasan}
              onBlur={() => setTouched((t) => ({ ...t, alasan: true }))}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Minimal 10 karakter..."
              className="w-full rounded border border-stroke bg-transparent py-3 px-4 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input"
            />
            {touched.alasan && errors.alasan && (
              <p className="mt-1 text-sm text-danger">{errors.alasan}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ButtonOne type="submit" disabled={submitting || !isValid}>
              <span>{submitting ? "Menyimpan..." : "Submit Lembur"}</span>
            </ButtonOne>
            {!isValid && (
              <p className="text-sm text-meta-1">
                Periksa kembali input Anda.
              </p>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Overtime;

