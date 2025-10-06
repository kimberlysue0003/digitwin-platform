// Digital Twin Backend Server
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import buildingsRouter from './routes/buildings.js';
import mapTexturesRouter from './routes/map-textures.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (map textures and other assets)
const frontendPublicPath = path.join(__dirname, '../../digitwin-frontend/public');
app.use('/static', express.static(frontendPublicPath));

// API Routes
app.use('/api/buildings', buildingsRouter);
app.use('/api/map-textures', mapTexturesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Digital Twin Backend Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoints:`);
  console.log(`  GET /api/buildings - List all planning areas`);
  console.log(`  GET /api/buildings/:areaId - Get buildings for area`);
  console.log(`  GET /api/map-textures/:areaId - Get map texture metadata`);
  console.log(`Static files: /static/*`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
