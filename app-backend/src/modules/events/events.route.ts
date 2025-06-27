import { Router } from 'express';
import eventsController from './events.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

// GET all events - No ID needed
router.get(
  '/getEvents',
  authenticateToken,
  eventsController.getEvents
);

// GET single event by ID - Pass ID as query parameter (?id=event_id)
router.get(
  '/getEvent',
  authenticateToken,
  eventsController.getEventById
);

// POST create new event - No ID needed
router.post(
  '/createEvent',
  authenticateToken,
  eventsController.createEvent
);

// PUT update event - Include ID in request body
router.put(
  '/updateEvent',
  authenticateToken,
  eventsController.updateEvent
);

// DELETE event - Include ID in request body
router.delete(
  '/deleteEvent',
  authenticateToken,
  eventsController.deleteEvent
);

export default router;