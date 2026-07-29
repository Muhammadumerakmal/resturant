import { Router } from "express";
import * as reservationController from "../controllers/reservation.controller";
import { requireStaff } from "../middlewares/auth.middleware";
import {
  attachCustomer,
  requireCustomer,
} from "../middlewares/customerAuth.middleware";

export const reservationsRouter = Router();

// A signed-in customer's own bookings — declared before "/" so it's unambiguous.
reservationsRouter.get(
  "/mine",
  requireCustomer,
  reservationController.listMyReservations,
);

// Public booking request from the website; soft-attach a signed-in customer so
// the booking links to their account (attachCustomer never blocks guests).
reservationsRouter.post(
  "/",
  attachCustomer,
  reservationController.createReservation,
);

// Staff review.
reservationsRouter.get("/", requireStaff, reservationController.listReservations);
reservationsRouter.patch(
  "/:id/status",
  requireStaff,
  reservationController.updateReservationStatus,
);
