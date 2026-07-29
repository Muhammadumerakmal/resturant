import { Router } from "express";
import * as settingsController from "../controllers/settings.controller";
import { requireStaff } from "../middlewares/auth.middleware";

export const settingsRouter = Router();

// Public read (website header/footer); staff-only update.
settingsRouter.get("/", settingsController.getSettings);
settingsRouter.patch("/", requireStaff, settingsController.updateSettings);
