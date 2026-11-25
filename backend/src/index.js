const express = require('express');
const cors = require('cors');
const { PORT, FRONTEND_URL } = require('./config/env');
const { connectDb } = require('./config/db');
const { requireAuth, blockViewerWrites } = require('./middleware/auth');

const hierarchyRoutes = require('./routes/hierarchy');
const energyRoutes = require('./routes/energy');
const analyticsRoutes = require('./routes/analytics');
const alertRoutes = require('./routes/alerts');
const insightsRoutes = require('./routes/insights');

const app = express();

app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Public health check
app.get('/api/health', async (req, res) => {
  try {
    const { db } = await connectDb();
    await db.command({ ping: 1 });
    res.json({ ok: true, service: 'wattwise-backend', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database unavailable' });
  }
});

// Protect all domain APIs with JWT + RBAC + Viewer Read-Only lock
app.use('/api', requireAuth);
app.use('/api', (req, res, next) => {
  // Allow any user (including Viewer) to update their personal UI theme/profile preference only
  if (req.path === '/profile' && req.method === 'PATCH') {
    return next();
  }
  return blockViewerWrites(req, res, next);
});

app.use('/api', hierarchyRoutes);
app.use('/api', energyRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', alertRoutes);
app.use('/api', insightsRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

async function startServer() {
  await connectDb();
  app.listen(PORT, () => {
    console.log(`WattWise Express API listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start WattWise backend:', err);
    process.exit(1);
  });
}

module.exports = app;
