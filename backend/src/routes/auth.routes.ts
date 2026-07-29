import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireCustomer } from "../middlewares/customerAuth.middleware";

export const authRouter = Router();

authRouter.post("/signup", authController.signup);
authRouter.post("/login", authController.login);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireCustomer, authController.me);
