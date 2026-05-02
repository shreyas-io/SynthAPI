import type { NextFunction, Request, Response } from "express";

export const responseMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  const json = res.json.bind(res);

  res.json = (data) => {
    if (res.statusCode >= 400) {
      return json(data);
    }

    return json({ status: "success", data });
  };

  next();
};
