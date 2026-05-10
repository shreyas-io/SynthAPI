import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(dirname, "../migrations");

const usage = "Usage: pnpm --filter @mock-stack/agent-orchestration-engine migrate:create <name>";

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const pad = (value: number): string => String(value).padStart(2, "0");

const createTimestamp = (): string => {
  const now = new Date();

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
};

const template = `import type { Kysely } from "kysely";

export async function up(_db: Kysely<unknown>): Promise<void> {}

export async function down(_db: Kysely<unknown>): Promise<void> {}
`;

const run = async () => {
  const rawName = process.argv[2];

  if (!rawName) {
    throw new Error(usage);
  }

  const name = slugify(rawName);

  if (!name) {
    throw new Error("Migration name must contain at least one alphanumeric character");
  }

  const filename = `${createTimestamp()}_${name}.ts`;
  const target = path.join(migrationsFolder, filename);

  await fs.mkdir(migrationsFolder, { recursive: true });
  await fs.writeFile(target, template, { flag: "wx" });

  console.log(path.relative(process.cwd(), target));
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
