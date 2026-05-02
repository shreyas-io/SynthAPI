import type { NextFunction, Request, Response } from "express";

export const errorMiddleware = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(error);

  const body = {
    status: "error",
    error: {
      message:
        typeof error?.["public_message"] === "string"
          ? error?.["public_message"]
          : "Some Error Occurred",
    },
  };

  let status_code = 500;
  if (
    typeof error.status_code === "number" &&
    error.status_code >= 400 &&
    error.status_code <= 599
  ) {
    status_code = error.status_code;
  }

  res.status(status_code).json(body);
};
