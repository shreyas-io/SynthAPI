import type { AppContext } from "../../server";
import {
  ApiGatewayException,
  HttpStatusCode,
} from "../exceptions/exception";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  created_at: Date;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

export const ContactUsecase = (ctx: AppContext) => {
  const assertRateLimit = async () => {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const result = await ctx.db
      .selectFrom("contact_messages")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("created_at", ">=", since)
      .executeTakeFirst();

    const count = Number(result?.count ?? 0);

    if (count >= RATE_LIMIT_MAX_REQUESTS) {
      throw new ApiGatewayException({
        public_message: "Too many requests. Please try again in a minute.",
        status_code: HttpStatusCode.TOO_MANY_REQUESTS,
      });
    }
  };

  const createContactMessage = async (input: {
    name: string;
    email: string;
    company?: string | undefined;
    message: string;
  }): Promise<ContactMessage> => {
    await assertRateLimit();

    const row = await ctx.db
      .insertInto("contact_messages")
      .values({
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        message: input.message,
      })
      .returning([
        "id",
        "name",
        "email",
        "company",
        "message",
        "created_at",
      ])
      .executeTakeFirstOrThrow();

    return row;
  };

  return { createContactMessage };
};