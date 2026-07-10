require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const NodeCache = require('node-cache');

// ── Supabase client ────────────────────────────────────────────────────────────
const { supabase } = require('./config/supabase');

// ── Services ──────────────────────────────────────────────────────────────────
const { fetchLiveWeather, saveWeatherLog } = require('./services/weather.service');
const { savePrediction, logAIRequest } = require('./services/prediction.service');
const { createAlert } = require('./services/alert.service');

// ── Express + Socket.IO ────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] },
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── Routes (all API endpoints) ─────────────────────────────────────────────────
app.use('/api', require('./routes/index'));

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// ── Constants ──────────────────────────────────────────────────────────────────
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const aiCache = new NodeCache({ stdTTL: 300 }); // 5 min

const FORESTS = [
  { id: 'similipal', name: 'Similipal Forest, India', lat: 21.93, lng: 86.44 },
  { id: 'bandipur', name: 'Bandipur Reserve, India', lat: 11.66, lng: 76.62 },
  { id: 'amazon', name: 'Amazon Rainforest, Brazil', lat: -3.46, lng: -62.21 },
  { id: 'yosemite', name: 'Yosemite Park, USA', lat: 37.86, lng: -119.53 },
];

let globalAlerts = [
  {
    id: 1,
    location: 'Amazon Rainforest, Brazil',
    risk: 'CRITICAL',
    severity: 'ff-danger',
    message: 'AI detected High Temperature (41°C), Low Humidity. Risk Score: 92.5%',
    time: '2 mins ago',
    lat: -3.46,
    lng: -62.21
  },
  {
    id: 2,
    location: 'Similipal Forest, India',
    risk: 'HIGH',
    severity: 'ff-warning',
    message: 'AI detected strong winds and dry vegetation. Risk Score: 78.1%',
    time: '15 mins ago',
    lat: 21.93,
    lng: 86.44
  }
];
let historyMap = {};
FORESTS.forEach((f) => {
  const baseRisk = f.name.includes('Amazon') ? 85 : f.name.includes('Similipal') ? 70 : 40;
  historyMap[f.name] = Array.from({ length: 15 }).map((_, i) => {
    const t = new Date(Date.now() - (15 - i) * 60000);
    return {
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      risk: Math.max(0, Math.min(100, baseRisk + (Math.random() * 10 - 5)))
    };
  });
});

// ── AI Polling Loop ────────────────────────────────────────────────────────────
const pollAIService = async () => {
  try {
    const payload = {};

    for (let i = 0; i < FORESTS.length; i++) {
      const forest = FORESTS[i];
      let telemetry;

      try {
        telemetry = await fetchLiveWeather(forest.lat, forest.lng);
        telemetry.location_name = forest.name;
      } catch (err) {
        console.error(`[Weather] Failed for ${forest.name}:`, err.message);
        continue;
      }

      let prediction;
      const aiCacheKey = `ai_${forest.name}`;

      if (aiCache.has(aiCacheKey)) {
        prediction = aiCache.get(aiCacheKey);
      } else {
        const t0 = Date.now();
        try {
          const response = await axios.post(`${AI_SERVICE_URL}/predict-risk`, telemetry, { timeout: 5000 });
          prediction = response.data;
          aiCache.set(aiCacheKey, prediction);

          // Persist AI result
          await logAIRequest({
            forest_name: forest.name,
            model_used: 'HuggingFace/FastAPI',
            input_payload: telemetry,
            output_payload: prediction,
            latency_ms: Date.now() - t0,
            success: true,
          });

          await savePrediction({
            forest_region_id: null, // link once forest_regions table is populated
            risk_score: prediction.risk_score,
            risk_category: prediction.risk_category,
            confidence: prediction.confidence,
            reasons: prediction.reasons,
            feature_importance: prediction.feature_importance,
            telemetry_snapshot: telemetry,
          }).catch((e) => console.error('[Prediction Save]', e.message));

        } catch (err) {
          await logAIRequest({
            forest_name: forest.name,
            model_used: 'HuggingFace/FastAPI',
            input_payload: telemetry,
            output_payload: null,
            latency_ms: Date.now() - t0,
            success: false,
          });

          if (historyMap[forest.name].length > 0) {
            const lastRisk = historyMap[forest.name][historyMap[forest.name].length - 1].risk;
            prediction = {
              risk_score: lastRisk,
              risk_category: lastRisk > 80 ? 'CRITICAL' : lastRisk > 60 ? 'HIGH' : 'LOW',
              confidence: 0,
              reasons: ['AI Service Offline – Cached Assessment'],
              feature_importance: { temperature: 0.5, wind_speed: 0.5 },
            };
          } else {
            console.error(`[AI] No history for ${forest.name}, skipping.`);
            continue;
          }
        }
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Inject slight random noise (-1 to +1) to the cached AI prediction so the live charts don't flatline
      const baseScore = prediction.risk_score;
      const noisyRisk = parseFloat(Math.max(0, Math.min(100, baseScore + (Math.random() * 2 - 1))).toFixed(1));
      
      historyMap[forest.name].push({ time: timestamp, risk: noisyRisk });
      if (historyMap[forest.name].length > 20) historyMap[forest.name].shift();

      // Create alert in Supabase if risk is HIGH/CRITICAL
      if (['CRITICAL', 'HIGH'].includes(prediction.risk_category)) {
        const isDuplicate = globalAlerts.some(
          (a) => a.location === telemetry.location_name && a.risk === prediction.risk_category
        );
        if (!isDuplicate) {
          const newAlert = {
            id: Date.now() + i,
            location: telemetry.location_name,
            risk: prediction.risk_category,
            severity: prediction.risk_category === 'CRITICAL' ? 'ff-danger' : 'ff-warning',
            message: `AI detected ${prediction.reasons.join(', ')}. Risk Score: ${prediction.risk_score.toFixed(1)}%`,
            time: 'Just now',
            lat: telemetry.lat,
            lng: telemetry.lng,
          };
          globalAlerts.unshift(newAlert);

          // Persist to Supabase alerts table
          await createAlert({
            title: `${prediction.risk_category} Risk – ${telemetry.location_name}`,
            message: newAlert.message,
            severity: prediction.risk_category,
            lat: telemetry.lat,
            lng: telemetry.lng,
          }).catch((e) => console.error('[Alert Save]', e.message));
        }
      }

      if (globalAlerts.length > 10) globalAlerts.pop();
      payload[forest.name] = { telemetry, prediction, history: historyMap[forest.name] };
    }

    if (Object.keys(payload).length > 0) {
      io.emit('live_telemetry_update', { forests: payload, alerts: globalAlerts });
    }
  } catch (err) {
    console.error('[Poll] Error in AI polling loop:', err.message);
  }
};

// ── WebSocket ──────────────────────────────────────────────────────────────────
let aiPollingInterval;
io.on('connection', (socket) => {
  console.log('[WS] Frontend connected:', socket.id);
  if (!aiPollingInterval) {
    aiPollingInterval = setInterval(pollAIService, 10000);
  }
  socket.on('disconnect', () => console.log('[WS] Frontend disconnected:', socket.id));
});

// ── Startup Verification ───────────────────────────────────────────────────────
const {
  checkDatabaseConnection,
  checkSupabaseConnection,
  checkStorage,
  checkRealtime,
  checkTables,
} = require('./services/supabase.service');
const { checkWeatherAPIHealth } = require('./services/weather.service');

async function runStartupChecks() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔥 IGNIS.AI Backend — Startup Verification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const icon = (ok) => (ok ? '  ✓' : '  ✗');

  // Express
  console.log(`${icon(true)} Express Running on port ${process.env.PORT || 5000}`);

  // Supabase connectivity
  const sb = await checkSupabaseConnection();
  console.log(`${icon(sb.ok)} Supabase ${sb.ok ? 'Connected' : `Unavailable — ${sb.error}`}`);
  if (!sb.ok) console.log('      Fix: Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env');

  // Database
  const db = await checkDatabaseConnection();
  console.log(`${icon(db.ok)} Database ${db.ok ? 'Connected' : `Unavailable — ${db.error}`}`);
  if (!db.ok) console.log('      Fix: Check your Supabase project is active at supabase.com');

  // Storage
  const storage = await checkStorage();
  console.log(`${icon(storage.ok)} Storage ${storage.ok ? 'Connected' : `Unavailable — ${storage.error}`}`);

  // Realtime
  const realtime = await checkRealtime();
  console.log(`${icon(realtime.ok)} Realtime ${realtime.ok ? 'Connected' : `Unavailable — ${realtime.error}`}`);

  // Weather API
  const weather = await checkWeatherAPIHealth();
  console.log(`${icon(weather.ok)} Weather API ${weather.ok ? 'Ready' : `Unavailable — ${weather.error}`}`);

  // AI Service
  try {
    await Promise.any([
      require('axios').get(`${AI_SERVICE_URL}/health`, { timeout: 3000 }),
      require('axios').get(`${AI_SERVICE_URL}/`, { timeout: 3000 }),
    ]);
    console.log(`${icon(true)} AI Service Running at ${AI_SERVICE_URL}`);
  } catch {
    console.log(`  ✗ AI Service Offline at ${AI_SERVICE_URL}`);
    console.log('      Fix: Run: cd backend/ai && uvicorn main:app --reload');
  }

  // Table audit
  if (db.ok) {
    console.log('\n  📋 Table Audit:');
    const tables = await checkTables();
    const missing = Object.entries(tables).filter(([, exists]) => !exists).map(([t]) => t);
    const present = Object.entries(tables).filter(([, exists]) => exists).map(([t]) => t);
    present.forEach((t) => console.log(`  ✓  ${t}`));
    missing.forEach((t) => console.log(`  ✗  ${t} — MISSING`));
    if (missing.length > 0) {
      console.log('\n  ⚠️  Missing tables detected!');
      console.log('      Fix: Run backend/supabase/schema.sql in Supabase → SQL Editor → New Query');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🌐 Health: http://localhost:${process.env.PORT || 5000}/api/health`);
  console.log(`  🧪 Test DB: http://localhost:${process.env.PORT || 5000}/api/test-db`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  runStartupChecks();
});

