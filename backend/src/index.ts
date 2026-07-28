import express from "express";
import cors from "cors";
import { menuRouter } from "./routes/menu";
import { ordersRouter } from "./routes/orders";
import { agentRouter } from "./routes/agent";

const app = express();

app.use(
  cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/v1/menu", menuRouter);
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1/agent", agentRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`backend listening on http://localhost:${port}`);
});
