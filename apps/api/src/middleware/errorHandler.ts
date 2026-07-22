import { AppError } from "../utils/appError.js";
import type { Request, Response, NextFunction } from "express";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.status).json({
          error: err.message,
          code: err.code,
        });
      }
      console.error("Unhandled API error:", err);
      return res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      });
}