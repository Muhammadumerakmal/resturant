import { Router } from "express";
import * as agentController from "../controllers/agent.controller";
import { requireStaff } from "../middlewares/auth.middleware";

export const agentRouter = Router();

agentRouter.post("/chat", agentController.chat);
// Owner analytics assistant — staff only.
agentRouter.post("/owner-chat", requireStaff, agentController.ownerChat);
