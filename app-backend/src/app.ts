// src/app.ts
import express, { type RequestHandler } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';

import authRoutes from './modules/auth/auth.routes';
import weatherRoutes from './modules/weather/weather.routes';
import closetRoutes from './modules/closet/closet.route';
import userPrefRoutes from './modules/userPreference/userPref.routes';
import eventsRoutes from './modules/events/events.route';
import outfitRoutes from './modules/outfit/outfit.routes';
import inspoRoutes from './modules/inspo/inspo.routes';
import socialRoutes from './modules/social/social.route';
import packingRoutes from './modules/packing/packing.route';
import usersRoutes from './modules/users/users.routes';
import tryonRoutes from "./modules/tryon/tryon.routes";
import tryonSelfRoutes from './modules/tryon-self/tryon-self.routes';
import fs from 'fs';

dotenv.config();
const app = express();

app.use(cors());
// app.use(express.json());

// To allow transfer of base64 images 
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// serve uploaded images
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/closet', closetRoutes);
app.use('/api/preferences', userPrefRoutes);
app.use('/api/events', eventsRoutes); 
app.use('/api/outfits', outfitRoutes);
app.use('/api/inspo', inspoRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/packing', packingRoutes);
app.use('/api/users', usersRoutes);
app.use(`/api/tryon`, tryonRoutes);
app.use('/api/tryon-self', tryonSelfRoutes);

// health check
const healthz: RequestHandler = (_req, res) => {
  res.status(200).json({ ok: true });
};
app.get('/healthz', healthz);

// global error handler (JSON)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({
    message: err?.message ?? 'Internal Server Error',
  });
});


export default app;