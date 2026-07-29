import { Router } from "express";
import { menuRouter } from "./menu.routes";
import { ordersRouter } from "./order.routes";
import { agentRouter } from "./agent.routes";
import { analyticsRouter } from "./analytics.routes";
import { authRouter } from "./auth.routes";
import { reservationsRouter } from "./reservation.routes";
import { customersRouter } from "./customer.routes";
import { settingsRouter } from "./settings.routes";

// Mounts all v1 API routers under /api/v1.
export const apiRouter = Router();

apiRouter.use("/menu", menuRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/agent", agentRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/reservations", reservationsRouter);
apiRouter.use("/customers", customersRouter);
apiRouter.use("/settings", settingsRouter);
