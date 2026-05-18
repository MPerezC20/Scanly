// server.js - API endpoints para comunicarte con el frontend
const express = require('express');
const cors = require('cors');
const Database = require('./database');

const app = express();
const db = new Database();

app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Servir archivos estáticos

// ========== ENDPOINTS API ==========

// 1. Aprender nueva palabra
app.post('/api/learn', async (req, res) => {
  const { word, category, confidence, mapsTo } = req.body;
  
  try {
    const result = await db.learnWord(word, category, confidence, mapsTo);
    res.json({ success: true, message: 'Palabra aprendida', data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Verificar palabra
app.post('/api/check-word', async (req, res) => {
  const { word } = req.body;
  
  try {
    const result = await db.isCyberbullyingWord(word);
    res.json({ 
      isBullying: !!result, 
      wordData: result 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Registrar detección
app.post('/api/register-detection', async (req, res) => {
  try {
    const result = await db.registerDetection(req.body);
    res.json({ success: true, detectionId: result.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Obtener estadísticas generales
app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await db.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Obtener estadísticas semanales
app.get('/api/weekly-stats', async (req, res) => {
  try {
    const stats = await db.getWeeklyStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Obtener estadísticas de aprendizaje supervisado
app.get('/api/learning-stats', async (req, res) => {
  try {
    const learningStats = await new Promise((resolve, reject) => {
      const stats = {};

      // Total palabras aprendidas
      db.db.get(`SELECT COUNT(*) as total FROM learned_words`, (err, row) => {
        stats.totalLearned = row.total;

        // Pendientes
        db.db.get(`SELECT COUNT(*) as total FROM pending_words WHERE status = 'pending'`, (err, row) => {
          stats.pending = row.total;

          // Aprobadas
          db.db.get(`SELECT COUNT(*) as total FROM pending_words WHERE status = 'approved'`, (err, row) => {
            stats.approved = row.total;

            // Rechazadas
            db.db.get(`SELECT COUNT(*) as total FROM pending_words WHERE status = 'rejected'`, (err, row) => {
              stats.rejected = row.total;

              // Por categoría
              db.db.all(`SELECT category, COUNT(*) as count FROM learned_words GROUP BY category`, (err, rows) => {
                stats.byCategory = rows;
                resolve(stats);
              });
            });
          });
        });
      });
    });
    res.json(learningStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// En backend/server.js - Agregar después de los otros endpoints

// Obtener todas las palabras aprendidas
app.get('/api/learned-words', async (req, res) => {
    try {
        const db = new Database();
        const words = await new Promise((resolve, reject) => {
            db.db.all(`SELECT word, category, confidence, maps_to, times_detected FROM learned_words ORDER BY times_detected DESC`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        db.close();
        res.json(words);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ENDPOINTS APRENDIZAJE SUPERVISADO ==========

// Guardar palabra como pendiente (en lugar de aprender directamente)
app.post('/api/pending', async (req, res) => {
  const { word, category, confidence, mapsTo, detectedText, source } = req.body;
  
  try {
    const result = await db.savePendingWord(word, category, confidence, mapsTo, detectedText, source || 'system');
    res.json({ success: true, message: 'Palabra guardada para revisión', pendingId: result.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener palabras pendientes de aprobación
app.get('/api/pending-words', async (req, res) => {
  try {
    const words = await db.getPendingWords();
    res.json(words);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar palabra pendiente
app.post('/api/approve-pending', async (req, res) => {
  const { id } = req.body;
  
  try {
    const result = await db.approvePendingWord(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rechazar palabra pendiente
app.post('/api/reject-pending', async (req, res) => {
  const { id } = req.body;

  try {
    const result = await db.rejectPendingWord(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener progreso del aprendizaje (gráfico)
app.get('/api/learning-progress', async (req, res) => {
  try {
    const progress = await db.getLearningProgress();
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener resumen del aprendizaje
app.get('/api/learning-summary', async (req, res) => {
  try {
    const summary = await db.getLearningSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de frases analizadas
app.get('/api/detection-history', async (req, res) => {
  try {
    const history = await db.getUserDetectionHistory(null, 30);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
