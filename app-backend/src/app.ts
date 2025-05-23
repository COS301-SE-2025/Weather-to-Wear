import express from 'express';
import dotenv from 'dotenv';
// for authentication
import authRoutes from './modules/auth/auth.routes';
// for weather API
import weatherRoutes from './modules/weather/weather.routes';

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);

export default app;
