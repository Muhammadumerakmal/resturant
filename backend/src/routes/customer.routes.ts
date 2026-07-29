import { Router } from "express";
import * as customerController from "../controllers/customer.controller";
import { requireStaff } from "../middlewares/auth.middleware";

export const customersRouter = Router();

// Staff-only: aggregated customers + a single customer's order history.
customersRouter.get("/", requireStaff, customerController.listCustomers);
customersRouter.get(
  "/:phone/orders",
  requireStaff,
  customerController.getCustomerOrders,
);
