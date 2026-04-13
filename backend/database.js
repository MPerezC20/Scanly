// database.js - Funciones para usar en tu aplicación
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '../database/cyberbullying.db'));
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
          this.updateDailyStats();
          resolve({ id: this.lastID });
        }
      });
    });
  }

  // ========== OBTENER ESTADÍSTICAS ==========
  async getStatistics() {
    return new Promise((resolve, reject) => {
      const stats = {};
      
      // Total de palabras aprendidas
      this.db.get(`SELECT COUNT(*) as total FROM learned_words`, (err, row) => {
        stats.totalLearnedWords = row.total;
        
        // Total de detecciones
        this.db.get(`SELECT COUNT(*) as total FROM detections`, (err, row) => {
          stats.totalDetections = row.total;
          
          // Detecciones por categoría
          this.db.all(`
            SELECT category, COUNT(*) as count 
            FROM detections 
            GROUP BY category
          `, (err, rows) => {
            stats.detectionsByCategory = rows;
            
            // Palabras más detectadas
            this.db.all(`
              SELECT detected_word, COUNT(*) as times
              FROM detections
              GROUP BY detected_word
              ORDER BY times DESC
              LIMIT 5
            `, (err, rows) => {
              stats.topWords = rows;
              resolve(stats);
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

  // ========== CERRAR CONEXIÓN ==========
  close() {
    this.db.close();
  }
}

module.exports = Database;