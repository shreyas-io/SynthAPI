import {
  HttpStatusCode,
  MockApiException,
} from "../../domain/exceptions/exception";
import { IKeyValueStore } from "../../domain/interfaces/kv_store";
import { CloudflareKVStore } from "./cloudflare_kv";

export const createKeyValueStore = (env: {
  KV?: KVNamespace;
}): IKeyValueStore => {
  if (!env.KV) {
    throw new MockApiException({
      public_message: "Some Error Occurred",
      message: "Cloudflare KV not configured",
      status_code: HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  }

  return CloudflareKVStore(env.KV);
};
