const db = require('../db');

function createInscripcion({ carrera, nombre, cedula, correo, documentos, observaciones }) {
  return new Promise((resolve, reject) => {
    const stmt = `INSERT INTO inscripciones (carrera, nombre, cedula, correo, documentos, observaciones) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(stmt, [carrera, nombre, cedula, correo, JSON.stringify(documentos), observaciones], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, carrera, nombre, cedula, correo, documentos, observaciones });
    });
  });
}

function findById(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM inscripciones WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      try {
        row.documentos = row.documentos ? JSON.parse(row.documentos) : [];
      } catch (e) {
        row.documentos = [];
      }
      resolve(row);
    });
  });
}

module.exports = { createInscripcion, findById }; 