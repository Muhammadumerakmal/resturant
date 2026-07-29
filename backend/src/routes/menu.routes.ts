import { Router } from "express";
import * as menuController from "../controllers/menu.controller";
import { requireStaff } from "../middlewares/auth.middleware";

export const menuRouter = Router();

// Public read.
menuRouter.get("/", menuController.getMenu);
menuRouter.get("/:id", menuController.getItem);

// Owner admin CRUD (staff-only).
menuRouter.post("/", requireStaff, menuController.createItem);
menuRouter.patch("/:id/availability", requireStaff, menuController.toggleAvailability);
menuRouter.patch("/:id/stock", requireStaff, menuController.setStock);
menuRouter.patch("/:id", requireStaff, menuController.updateItem);
menuRouter.delete("/:id", requireStaff, menuController.removeItem);
