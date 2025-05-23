import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import path from 'path';
import imageUploads from './modules/closet/imageUpload';

dotenv.config();

const app = express();
app.use(express.static(path.join(__dirname, '../public')));


// full cors config:
// app.use(cors({
//   origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // include both forms
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type'],
//   credentials: true
// }));

app.use(cors());


// handle preflight requests
// app.options('*', cors());



app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
console.log('Routes initialized');
app.use('/api/auth', authRoutes);
app.use('/api/closet', imageUploads); 

export default app;
