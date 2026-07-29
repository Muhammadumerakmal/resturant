import { Router } from "express";
import * as promotionController from "../controllers/promotion.controller";
import { requireStaff } from "../middlewares/auth.middleware";

export const promotionsRouter = Router();

// Public: resolve a code to its discount (for a future checkout step).
promotionsRouter.post("/validate", promotionController.validatePromotion);

// Owner admin CRUD (staff-only).
promotionsRouter.get("/", requireStaff, promotionController.listPromotions);
promotionsRouter.post("/", requireStaff, promotionController.createPromotion);
promotionsRouter.patch("/:id", requireStaff, promotionController.updatePromotion);
promotionsRouter.delete("/:id", requireStaff, promotionController.removePromotion);
