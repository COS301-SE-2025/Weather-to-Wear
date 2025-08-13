// events.route.ts
import { Router } from 'express';
import eventsController from './events.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.get(
  '/getEvents',
  authenticateToken,
  eventsController.getEvents
);

router.get(
  '/getEvent',
  authenticateToken,
  eventsController.getEventById
);

router.post(
  '/createEvent',
  authenticateToken,
  eventsController.createEvent
);

router.put(
  '/updateEvent',
  authenticateToken,
  eventsController.updateEvent
);

router.delete(
  '/deleteEvent',
  authenticateToken,
  eventsController.deleteEvent
);

export default router;