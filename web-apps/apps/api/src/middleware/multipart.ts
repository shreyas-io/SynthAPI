import { createMiddleware } from "hono/factory";

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

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
};

export const parseMultipartRequest = createMiddleware(async (c, next) => {
  const content_type = c.req.header("content-type") ?? "";

  if (!content_type.toLowerCase().includes("multipart/form-data")) {
    await next();
    return;
  }

  const formData = await c.req.formData();
  let total_bytes = 0;

  const fields: Record<string, MultipartField | MultipartField[]> = {};

  for (const [fieldname, value] of formData.entries()) {
    if (typeof value === "string") {
      total_bytes += value.length;
      if (total_bytes > MAX_TOTAL_MULTIPART_SIZE_BYTES) {
        throw Object.assign(
          new Error("Multipart body exceeds 50MB total size limit."),
          { status_code: 413 },
        );
      }

      appendField(fields, fieldname, {
        field_type: "text",
        value,
      });
    } else {
      const file = value as File;

      if (file.size > MULTIPART_FIELD_SIZE_LIMIT_BYTES) {
        throw Object.assign(
          new Error(
            `File '${file.name}' exceeds 10MB individual size limit.`,
          ),
          { status_code: 413 },
        );
      }

      total_bytes += file.size;
      if (total_bytes > MAX_TOTAL_MULTIPART_SIZE_BYTES) {
        throw Object.assign(
          new Error("Multipart body exceeds 50MB total size limit."),
          { status_code: 413 },
        );
      }

      const content_base64 = arrayBufferToBase64(await file.arrayBuffer());

      const file_field: Extract<MultipartField, { field_type: "file" }> = {
        field_type: "file",
        filename: file.name,
        mime_type: file.type,
        encoding: "base64",
        size_bytes: file.size,
        content_base64,
      };
      appendField(fields, fieldname, file_field);
    }
  }

  c.set("body", { type: "multipart", value: fields } as MultipartBody);
  await next();
});
