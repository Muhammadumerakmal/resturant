import { Router } from "express";
import * as menuController from "../controllers/menu.controller";

export const menuRouter = Router();

menuRouter.get("/", menuController.getMenu);
