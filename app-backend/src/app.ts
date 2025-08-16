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
import socialRoutes from './modules/social/social.route';
import usersRoutes from './modules/users/users.routes';
import fs from 'fs';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// serve uploaded images
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/closet', closetRoutes);
app.use('/api/preferences', userPrefRoutes);
app.use('/api/events', eventsRoutes); 
app.use('/api/outfits', outfitRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/users', usersRoutes);

// health check
const healthz: RequestHandler = (_req, res) => {
  res.status(200).json({ ok: true });
};
app.get('/healthz', healthz);

export default app;
