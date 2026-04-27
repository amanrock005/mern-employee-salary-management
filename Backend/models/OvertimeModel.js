import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Overtime = db.define(
  "data_lembur",
  {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    nik: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    nama_pegawai: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tanggal: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    jam_lembur: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
    },
    alasan: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "submitted",
    },
  },
  {
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ["nik", "tanggal"],
      },
    ],
  }
);

export default Overtime;
