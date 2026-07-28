import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import { requireStaff, requireStaffQuery } from "../middlewares/auth.middleware";
import { ordersStream } from "../realtime/orderListener";

export const ordersRouter = Router();

// GET /api/v1/orders/stream (SSE) — must be declared before "/:id" so "stream"
// isn't captured as an id. Staff-only; EventSource auths via ?key=.
ordersRouter.get("/stream", requireStaffQuery, ordersStream);

ordersRouter.get("/", requireStaff, orderController.listOrders);
ordersRouter.post("/", orderController.createOrder);
ordersRouter.get("/:id", requireStaff, orderController.getOrder);
ordersRouter.patch("/:id/status", requireStaff, orderController.updateOrderStatus);
