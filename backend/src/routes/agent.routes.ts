import { Router } from "express";
import * as agentController from "../controllers/agent.controller";

export const agentRouter = Router();

agentRouter.post("/chat", agentController.chat);
