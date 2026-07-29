import { Router } from "express";
import * as staffController from "../controllers/staff.controller";
import { requireStaff } from "../middlewares/auth.middleware";

export const staffRouter = Router();

// Owner-managed staff roster (staff-only).
staffRouter.get("/", requireStaff, staffController.listStaff);
staffRouter.post("/", requireStaff, staffController.createStaff);
staffRouter.patch("/:id", requireStaff, staffController.updateStaff);
staffRouter.delete("/:id", requireStaff, staffController.removeStaff);
