const db = require('../db');

function createUser(name, email, passwordHash) {
  return new Promise((resolve, reject) => {
    const stmt = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
    db.run(stmt, [name, email, passwordHash], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, name, email });
    });
  });
}

function findByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT id, name, email, password FROM users WHERE email = ?`, [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function findById(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT id, name, email FROM users WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

module.exports = { createUser, findByEmail, findById };
