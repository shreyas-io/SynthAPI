import Busboy from "busboy";
import type { NextFunction, Request, Response } from "express";

import type {
  MultipartField,
  MultipartBody,
} from "../domain/entities/execution_context";

const MULTIPART_FIELD_SIZE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB per field value
const MAX_TOTAL_MULTIPART_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB total body

const isFileField = (
  field: MultipartField,
): field is Extract<MultipartField, { field_type: "file" }> =>
  field.field_type === "file";

const appendField = (
  obj: Record<string, MultipartField | MultipartField[]>,
  key: string,
  field: MultipartField,
) => {
  if (key in obj) {
    const existing = obj[key]!;
    if (Array.isArray(existing)) {
      existing.push(field);
    } else {
      obj[key] = [existing, field];
    }
  } else {
    obj[key] = field;
  }
};

export function parseMultipartRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const content_type = req.headers["content-type"] ?? "";

  if (!content_type.toLowerCase().includes("multipart/form-data")) {
    next();
    return;
  }

  let total_bytes = 0;
  let aborted = false;

  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: MULTIPART_FIELD_SIZE_LIMIT_BYTES,
      fieldSize: MULTIPART_FIELD_SIZE_LIMIT_BYTES,
      fields: 100,
      files: 50,
    },
  });

  const fields: Record<string, MultipartField | MultipartField[]> = {};

  busboy.on("field", (fieldname, value, info) => {
    total_bytes += value.length;
    if (total_bytes > MAX_TOTAL_MULTIPART_SIZE_BYTES) {
      aborted = true;
      busboy.destroy();
      next(
        Object.assign(
          new Error("Multipart body exceeds 50MB total size limit."),
          { status: 413 },
        ),
      );
      return;
    }

    appendField(fields, fieldname, {
      field_type: "text",
      value,
    });
  });

  busboy.on("file", (fieldname, file_stream, info) => {
    const chunks: Buffer[] = [];
    let file_size = 0;

    file_stream.on("limit", () => {
      aborted = true;
      busboy.destroy();
      next(
        Object.assign(
          new Error(
            `File '${info.filename}' exceeds 10MB individual size limit.`,
          ),
          { status: 413 },
        ),
      );
    });

    file_stream.on("data", (chunk: Buffer) => {
      total_bytes += chunk.length;
      if (total_bytes > MAX_TOTAL_MULTIPART_SIZE_BYTES) {
        if (!aborted) {
          aborted = true;
          busboy.destroy();
          next(
            Object.assign(
              new Error("Multipart body exceeds 50MB total size limit."),
              { status: 413 },
            ),
          );
        }
        return;
      }
      file_size += chunk.length;
      chunks.push(chunk);
    });

    file_stream.on("end", () => {
      const buffer = Buffer.concat(chunks, file_size);
      const file_field: Extract<
        MultipartField,
        { field_type: "file" }
      > = {
        field_type: "file",
        filename: info.filename,
        mime_type: info.mimeType,
        encoding: info.encoding,
        size_bytes: buffer.length,
        content_base64: buffer.toString("base64"),
      };
      appendField(fields, fieldname, file_field);
    });
  });

  busboy.on("finish", () => {
    if (aborted) {
      return;
    }
    if (!res.headersSent) {
      const multipart_body: MultipartBody = {
        type: "multipart",
        value: fields,
      };
      req.body = multipart_body;
    }
    next();
  });

  busboy.on("error", (err: unknown) => {
    if (!aborted) {
      next(err);
    }
  });

  req.pipe(busboy);
}