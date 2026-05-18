// database.js - Funciones para usar en tu aplicación
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '../database/cyberbullying.db'));
    this.initPendingTable();
  }

  initPendingTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pending_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        category TEXT,
        confidence REAL,
        maps_to TEXT,
        detected_text TEXT,
        source TEXT DEFAULT 'system',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Compatibilidad con BD existente
    this.db.all(`PRAGMA table_info(pending_words)`, (err, rows) => {
      if (err || !rows) return;
      const hasSource = rows.some((r) => r.name === 'source');
      if (!hasSource) {
        this.db.run(`ALTER TABLE pending_words ADD COLUMN source TEXT DEFAULT 'system'`);
      }
    });
  }

  // ========== GUARDAR PALABRA PENDIENTE (APRENDIZAJE SUPERVISADO) ==========
  async savePendingWord(word, category, confidence, mapsTo = null, detectedText = null, source = 'system') {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO pending_words (word, category, confidence, maps_to, detected_text, source, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `;
      
      this.db.run(sql, [word.toLowerCase(), category, confidence, mapsTo, detectedText, source], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  }

  // ========== OBTENER PALABRAS PENDIENTES ==========
  async getPendingWords() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM pending_words 
        WHERE status = 'pending' 
        ORDER BY created_at DESC
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // ========== APROBAR PALABRA PENDIENTE ==========
  async approvePendingWord(id) {
    const db = this.db;
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM pending_words WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        if (!row) resolve({ success: false, message: 'Palabra no encontrada' });

        const learnSql = `
          INSERT INTO learned_words (word, category, confidence, maps_to, times_detected)
          VALUES (?, ?, ?, ?, 1)
          ON CONFLICT(word) DO UPDATE SET
            times_detected = times_detected + 1,
            updated_at = CURRENT_TIMESTAMP
        `;

        db.run(learnSql, [row.word, row.category, row.confidence, row.maps_to], function(err) {
          if (err) reject(err);

          db.run(`UPDATE pending_words SET status = 'approved' WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            resolve({ success: true, message: 'Palabra aprobada y aprendida' });
          });
        });
      });
    });
  }

  // ========== RECHAZAR PALABRA PENDIENTE ==========
  async rejectPendingWord(id) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE pending_words SET status = 'rejected' WHERE id = ?`;
      
      this.db.run(sql, [id], function(err) {
        if (err) reject(err);
        else resolve({ success: true, message: 'Palabra rechazada' });
      });
    });
  }

  // ========== APRENDER NUEVAS PALABRAS ==========
  async learnWord(word, category, confidence = 0.5, mapsTo = null) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO learned_words (word, category, confidence, maps_to, times_detected)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(word) DO UPDATE SET
          times_detected = times_detected + 1,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      this.db.run(sql, [word.toLowerCase(), category, confidence, mapsTo], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  // ========== VERIFICAR SI UNA PALABRA ES CYBERBULLYING ==========
  async isCyberbullyingWord(word) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM learned_words WHERE word = ?`;
      
      this.db.get(sql, [word.toLowerCase()], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // ========== REGISTRAR DETECCIÓN ==========
  async registerDetection(detection) {
    const self = this;
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO detections (user_id, original_text, detected_word, decoded_word, category, confidence, was_hidden)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        detection.userId || null,
        detection.originalText,
        detection.detectedWord,
        detection.decodedWord,
        detection.category,
        detection.confidence,
        detection.wasHidden ? 1 : 0
      ], function(err) {
        if (err) reject(err);
        else {
          // Actualizar estadísticas diarias
          self.updateDailyStats();
          resolve({ id: this.lastID });
        }
      });
    });
  }

  // ========== OBTENER ESTADÍSTICAS COMPLETAS ==========
  async getStatistics() {
    return new Promise((resolve, reject) => {
      const stats = {};

      // Total de palabras aprendidas (aprobadas)
      this.db.get(`SELECT COUNT(*) as total FROM learned_words`, (err, row) => {
        stats.totalLearnedWords = row.total;

        // Palabras pendientes de revisión
        this.db.get(`SELECT COUNT(*) as total FROM pending_words WHERE status = 'pending'`, (err, row) => {
          stats.pendingWords = row.total;

          // Palabras aprobadas
          this.db.get(`SELECT COUNT(*) as total FROM pending_words WHERE status = 'approved'`, (err, row) => {
            stats.approvedWords = row.total;

            // Palabras rechazadas
            this.db.get(`SELECT COUNT(*) as total FROM pending_words WHERE status = 'rejected'`, (err, row) => {
              stats.rejectedWords = row.total;

              // Total de detecciones
              this.db.get(`SELECT COUNT(*) as total FROM detections`, (err, row) => {
                stats.totalDetections = row.total;

                // Detecciones de hoy
                this.db.get(`SELECT COUNT(*) as total FROM detections WHERE DATE(timestamp) = DATE('now')`, (err, row) => {
                  stats.todayDetections = row.total;

                  // Aprendizaje basado en mensajes de usuario
                  this.db.get(`SELECT COUNT(*) as total FROM pending_words WHERE source = 'user_input' AND status = 'pending'`, (err, row) => {
                    stats.userInputPending = row ? row.total : 0;

                    this.db.get(`SELECT COUNT(*) as total FROM pending_words WHERE source = 'user_input' AND status = 'approved'`, (err, row) => {
                      stats.userInputApproved = row ? row.total : 0;

                      // Detecciones por categoría
                      this.db.all(`
                        SELECT category, COUNT(*) as count
                        FROM detections
                        GROUP BY category
                      `, (err, rows) => {
                        stats.detectionsByCategory = rows;

                        // Calcular detección de palabras ofensivas
                        this.db.get(`
                          SELECT COUNT(*) as total FROM detections
                          WHERE category IN ('ofensivo_leve', 'ofensivo_grave', 'discurso de odio', 'mild', 'serious', 'hate')
                        `, (err, row) => {
                          stats.offensiveDetections = row.total;

                          // Promedio de confianza
                          this.db.get(`SELECT AVG(confidence) as avg FROM detections`, (err, row) => {
                            stats.avgConfidence = row.avg || 0;

                            // Palabras más detectadas
                            this.db.all(`
                              SELECT detected_word, COUNT(*) as times
                              FROM detections
                              GROUP BY detected_word
                              ORDER BY times DESC
                              LIMIT 10
                            `, (err, rows) => {
                              stats.topWords = rows;
                              resolve(stats);
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  // ========== ESTADÍSTICAS POR FECHA ==========
  async getWeeklyStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as detections,
          COUNT(DISTINCT detected_word) as unique_words
        FROM detections
        WHERE timestamp >= DATE('now', '-7 days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // ========== ACTUALIZAR ESTADÍSTICAS DIARIAS ==========
  async updateDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const sql = `
      INSERT INTO daily_stats (date, total_detections)
      VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET
        total_detections = total_detections + 1
    `;
    
    this.db.run(sql, [today]);
  }

  // ========== OBTENER HISTORIAL DE DETECCIONES DEL USUARIO ==========
  async getUserDetectionHistory(userId = null, limit = 20) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM detections
        ORDER BY timestamp DESC
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // ========== ESTADÍSTICAS DE APRENDIZAJE POR FECHA ==========
  async getLearningProgress() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM pending_words
        WHERE created_at >= DATE('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      this.db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // ========== RESUMEN DE APRENDIZAJE ==========
  async getLearningSummary() {
    return new Promise((resolve, reject) => {
      const summary = {};

      this.db.get(`SELECT COUNT(*) as total FROM learned_words`, (err, row) => {
        summary.totalLearned = row.total;

        this.db.get(`SELECT SUM(times_detected) as total FROM learned_words`, (err, row) => {
          summary.totalDetections = row.total || 0;

          this.db.get(`
            SELECT category, COUNT(*) as count FROM learned_words
            GROUP BY category ORDER BY count DESC
          `, (err, rows) => {
            summary.topCategories = rows;

            this.db.get(`
              SELECT word, times_detected FROM learned_words
              ORDER BY times_detected DESC LIMIT 5
            `, (err, rows) => {
              summary.topLearnedWords = rows;
              resolve(summary);
            });
          });
        });
      });
    });
  }

  // ========== CERRAR CONEXIÓN ==========
  close() {
    this.db.close();
  }
}

module.exports = Database;
