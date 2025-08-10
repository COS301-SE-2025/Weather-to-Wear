import app from './app';
import cors from 'cors';
import { backfillWeatherForUpcomingEvents } from './modules/events/events.weather.job';

const PORT = process.env.PORT || 5001


// app.use(cors());

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

backfillWeatherForUpcomingEvents().catch(console.error);

setInterval(() => {
  backfillWeatherForUpcomingEvents().catch(console.error);
}, 24 * 60 * 60 * 1000);

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