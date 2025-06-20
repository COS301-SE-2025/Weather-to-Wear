import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
// for authentication
import authRoutes from './modules/auth/auth.routes';
// for weather API
import weatherRoutes from './modules/weather/weather.routes';
// for image upload
import closetRoutes from './modules/closet/closet.route';


const app = express();

app.use(cors());

dotenv.config();

app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/closet', closetRoutes);


export default app;
