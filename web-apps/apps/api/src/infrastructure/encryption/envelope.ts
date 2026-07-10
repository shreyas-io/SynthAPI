import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const ENVELOPE_ENCRYPTION_ALGORITHM = "aes-256-gcm";

type EncryptedPayload = {
  encrypted_value: string;
  iv: string;
  auth_tag: string;
};

const IV_LENGTH_BYTES = 12;

const deriveAesKey = (keyMaterial: string): Buffer => {
  return createHash("sha256").update(keyMaterial, "utf8").digest();
};

export const encryptBuffer = (
  value: Buffer,
  keyMaterial: string | Buffer,
): EncryptedPayload => {
  const key =
    typeof keyMaterial === "string" ? deriveAesKey(keyMaterial) : keyMaterial;
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ENVELOPE_ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);

  return {
    encrypted_value: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    auth_tag: cipher.getAuthTag().toString("base64"),
  };
};

export const decryptBuffer = (
  payload: EncryptedPayload,
  keyMaterial: string | Buffer,
): Buffer => {
  const key =
    typeof keyMaterial === "string" ? deriveAesKey(keyMaterial) : keyMaterial;
  const decipher = createDecipheriv(
    ENVELOPE_ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.auth_tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted_value, "base64")),
    decipher.final(),
  ]);
};

export const encryptString = (
  value: string,
  keyMaterial: string | Buffer,
): EncryptedPayload => encryptBuffer(Buffer.from(value, "utf8"), keyMaterial);

export const decryptString = (
  payload: EncryptedPayload,
  keyMaterial: string | Buffer,
): string => decryptBuffer(payload, keyMaterial).toString("utf8");

export const safeEqualStrings = (a: string, b: string): boolean => {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  return left.length === right.length && timingSafeEqual(left, right);
};
