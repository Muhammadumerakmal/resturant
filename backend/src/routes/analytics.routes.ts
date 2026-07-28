import { Router } from "express";
import * as statsController from "../controllers/stats.controller";
import { requireStaff } from "../middlewares/auth.middleware";

export const analyticsRouter = Router();

analyticsRouter.get("/", requireStaff, statsController.getAnalytics);
