const path = require('path');
let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (err) {
  console.error('[db] Error loading sqlite3 native bindings:', err && err.message ? err.message : err);
  console.error('[db] Detected Node.js version:', process.version);
  console.error('[db] Para resolverlo (elige una):');
  console.error('  1) Use Node 18: instalar Node 18 (por ejemplo con nvm) y reinstalar dependencias.');
  console.error("  2) Instale las Visual Studio Build Tools + Python 3 y ejecute 'npm rebuild sqlite3 --build-from-source'.");
  console.error("  3) En entornos de despliegue (Render) agregue 'postinstall' para rebuild sqlite3 o use Node 18 en el servicio.");
  console.error('[db] Si solo está desarrollando localmente y desea ejecutar sin SQLite, puede definir la variable de entorno DISABLE_DB=1 para omitir la inicialización.');
  // Exit early since DB is required for the app to function normally
  if (!process.env.DISABLE_DB) {
    console.error('[db] Saliendo: sqlite3 es necesario para ejecutar la aplicación.');
    process.exit(1);
  } else {
    console.warn('[db] DISABLE_DB está activado: la aplicación se ejecutará sin DB persistente (solo para desarrollo).');
  }
}

const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inscripciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      carrera TEXT NOT NULL,
      nombre TEXT NOT NULL,
      cedula TEXT NOT NULL,
      correo TEXT NOT NULL,
      documentos TEXT,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Posts para el módulo social
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Likes/dislikes: value = 1 (like) o -1 (dislike)
  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      value INTEGER NOT NULL CHECK (value IN (1, -1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Mensajes del chat global
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

module.exports = db;
