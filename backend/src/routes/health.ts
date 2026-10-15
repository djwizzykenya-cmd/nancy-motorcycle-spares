import express from "express";
import { asyncHandler } from "../middleware/errorHandler";

const router = express.Router();

// Health check endpoint
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: "Server is running"
    });
  })
);

export default router;
