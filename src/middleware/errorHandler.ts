import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
    constructor(
        public statusCode: number,
        message: string,
    ) {
        super(message)
    }
}

export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err)

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message
        })
    }

    res.status(500).json({error: "internal server error"})
}