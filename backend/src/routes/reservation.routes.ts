import { Router } from "express";
import * as reservationController from "../controllers/reservation.controller";
import { requireStaff } from "../middlewares/auth.middleware";

export const reservationsRouter = Router();

// Public booking request from the website.
reservationsRouter.post("/", reservationController.createReservation);

// Staff review.
reservationsRouter.get("/", requireStaff, reservationController.listReservations);
reservationsRouter.patch(
  "/:id/status",
  requireStaff,
  reservationController.updateReservationStatus,
);
