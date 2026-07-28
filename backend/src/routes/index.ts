import { Router } from "express";
import { menuRouter } from "./menu.routes";
import { ordersRouter } from "./order.routes";
import { agentRouter } from "./agent.routes";

// Mounts all v1 API routers under /api/v1.
export const apiRouter = Router();

apiRouter.use("/menu", menuRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/agent", agentRouter);
