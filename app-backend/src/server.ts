import app from './app';
import cors from 'cors';

const PORT = process.env.PORT || 5001


// app.use(cors());

const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin, credentials: true }));

try {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (err) {
  console.error('Failed to start server:', err);
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});