// init-db.js - Ejecutar UNA SOLA VEZ para crear la base de datos
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a la BD (se crea el archivo automáticamente)
const db = new sqlite3.Database(path.join(__dirname, '../database/cyberbullying.db'));

// Crear todas las tablas
db.serialize(() => {
  // 1. Tabla de palabras aprendidas
  db.run(`
    CREATE TABLE IF NOT EXISTS learned_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      maps_to TEXT,
      times_detected INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Tabla de detecciones (registro de cada análisis)
  db.run(`
    CREATE TABLE IF NOT EXISTS detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      original_text TEXT,
      detected_word TEXT,
      decoded_word TEXT,
      category TEXT,
      confidence REAL,
      was_hidden BOOLEAN DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Tabla de estadísticas diarias
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE UNIQUE,
      total_detections INTEGER DEFAULT 0,
      new_words_learned INTEGER DEFAULT 0,
      alerts_sent INTEGER DEFAULT 0
    )
  `);

  // 4. Tabla de usuarios (si quieres tracking por usuario)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Base de datos creada exitosamente');
  console.log('📁 Ubicación: /database/cyberbullying.db');
  console.log('📋 Tablas creadas: learned_words, detections, daily_stats, users');
});

// Insertar datos de ejemplo (palabras iniciales de cyberbullying)
db.serialize(() => {
  const initialWords = [
    ['idiota', 'insulto', 0.9],
    ['estúpido', 'insulto', 0.85],
    ['feo', 'apariencia', 0.7],
    ['inútil', 'insulto', 0.8],
    ['perdedor', 'insulto', 0.85],
    ['tonto', 'insulto', 0.75],
    ['bruto', 'insulto', 0.7],
    ['horrible', 'apariencia', 0.65]
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO learned_words (word, category, confidence) 
    VALUES (?, ?, ?)
  `);

  initialWords.forEach(word => {
    stmt.run(word[0], word[1], word[2]);
  });

  stmt.finalize();
  console.log('📚 Datos iniciales insertados');
});

// Cerrar conexión
db.close((err) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log('🔒 Conexión cerrada');
  }
});