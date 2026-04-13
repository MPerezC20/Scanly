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

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});