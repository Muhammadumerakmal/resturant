import type { Request, Response } from "express";
import * as customerModel from "../models/customer.model";

// GET /api/v1/customers -> CustomerSummary[] (staff)
export async function listCustomers(_req: Request, res: Response) {
  const rows = await customerModel.listCustomers();
  res.json(rows);
}

// GET /api/v1/customers/:phone/orders -> OrderWithItems[] (staff)
export async function getCustomerOrders(req: Request, res: Response) {
  const phone = decodeURIComponent(req.params.phone ?? "");
  if (!phone) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await customerModel.getCustomerOrders(phone);
  res.json(rows);
}
