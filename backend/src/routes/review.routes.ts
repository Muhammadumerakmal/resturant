import { Router } from "express";
import * as reviewController from "../controllers/review.controller";
import { requireStaff } from "../middlewares/auth.middleware";
import { attachCustomer } from "../middlewares/customerAuth.middleware";

export const reviewsRouter = Router();

// Staff moderation list — declared before "/" so "moderation" isn't ambiguous.
reviewsRouter.get("/moderation", requireStaff, reviewController.listForModeration);

// Public: submit a review (soft-attach a signed-in customer) + read published.
reviewsRouter.post("/", attachCustomer, reviewController.createReview);
reviewsRouter.get("/", reviewController.listPublished);

// Staff moderation action.
reviewsRouter.patch(
  "/:id/status",
  requireStaff,
  reviewController.updateReviewStatus,
);
