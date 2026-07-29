import type { Request, Response } from "express";
import { z } from "zod";
import {
  createReservationSchema,
  updateReservationStatusSchema,
} from "@repo/shared";
import * as reservationModel from "../models/reservation.model";

const uuid = z.string().uuid();

// POST /api/v1/reservations -> creates a booking request (public)
export async function createReservation(req: Request, res: Response) {
  const parsed = createReservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  // Soft-attached by attachCustomer: links the booking to a signed-in account,
  // but guests (no userId) can still book.
  const created = await reservationModel.createReservation(
    parsed.data,
    req.userId ?? null,
  );
  res.status(201).json(created);
}

// GET /api/v1/reservations/mine -> Reservation[] (signed-in customer)
export async function listMyReservations(req: Request, res: Response) {
  if (!req.userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const rows = await reservationModel.listReservationsForUser(req.userId);
  res.json(rows);
}

// GET /api/v1/reservations?status=&limit= -> Reservation[] (staff)
export async function listReservations(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 100;
  const rows = await reservationModel.listReservations({ status, limit });
  res.json(rows);
}

// PATCH /api/v1/reservations/:id/status { status } -> updated Reservation (staff)
export async function updateReservationStatus(req: Request, res: Response) {
  const { id } = req.params;
  if (!uuid.safeParse(id).success) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = updateReservationStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const updated = await reservationModel.updateStatus(id, parsed.data.status);
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
}
