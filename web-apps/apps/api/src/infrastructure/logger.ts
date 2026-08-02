type LogBindings = Record<string, unknown>;
type LogArg = string | LogBindings | Error | undefined;

const isObject = (value: unknown): value is LogBindings =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Errors carry their useful data (message/stack/name) on non-enumerable
// properties, so a plain JSON.stringify({ err }) yields { err: {} } and
// silently drops the failure details. This replacer serializes any Error
// instance — nested at any depth — into a plain object, including its own
// enumerable properties (e.g. status_code, public_message) and cause chain.
const errorReplacer = (_key: string, value: unknown) => {
  if (value instanceof Error) {
    const own: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      own[key] = (value as Record<string, unknown>)[key];
    }
    const base: Record<string, unknown> = {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
    if (value.cause !== undefined) {
      base.cause = value.cause;
    }
    return { ...base, ...own };
  }
  return value;
};

const stringify = (obj: Record<string, unknown>): string =>
  JSON.stringify(obj, errorReplacer);

const buildLogObject = (
  level: string,
  bindings: LogBindings,
  args: LogArg[],
): Record<string, unknown> => {
  const [first, second] = args;
  let msg: string | undefined;
  let data: LogBindings = {};

  if (typeof first === "string") {
    msg = first;
    if (isObject(second)) {
      data = second;
    } else if (second instanceof Error) {
      data = { err: second };
    }
  } else if (first instanceof Error) {
    data = { err: first };
    if (typeof second === "string") {
      msg = second;
    }
  } else if (isObject(first)) {
    data = first;
    if (typeof second === "string") {
      msg = second;
    }
  }

  return { level, msg, ...bindings, ...data };
};

const createLogger = (bindings: LogBindings = {}) => ({
  trace: (...args: LogArg[]) => {
    console.trace(stringify(buildLogObject("trace", bindings, args)));
  },
  debug: (...args: LogArg[]) => {
    console.debug(stringify(buildLogObject("debug", bindings, args)));
  },
  info: (...args: LogArg[]) => {
    console.info(stringify(buildLogObject("info", bindings, args)));
  },
  warn: (...args: LogArg[]) => {
    console.warn(stringify(buildLogObject("warn", bindings, args)));
  },
  error: (...args: LogArg[]) => {
    console.error(stringify(buildLogObject("error", bindings, args)));
  },
  fatal: (...args: LogArg[]) => {
    console.error(stringify(buildLogObject("fatal", bindings, args)));
  },
  child: (moreBindings: LogBindings) => createLogger({ ...bindings, ...moreBindings }),
});

const level =
  (typeof process !== "undefined" && process.env?.LOG_LEVEL) ||
  ((globalThis as typeof globalThis & { LOG_LEVEL?: string }).LOG_LEVEL) ||
  "info";

export const logger = createLogger({ level });

export type AppLogger = typeof logger;
