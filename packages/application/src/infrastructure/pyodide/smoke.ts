import { createPyodideWorkerPool } from "./index";

const pool = createPyodideWorkerPool({
  size: Number(process.env.PYODIDE_WORKER_POOL_SIZE ?? 2),
  max_queue_size: Number(process.env.PYODIDE_WORKER_POOL_QUEUE_SIZE ?? 10),
  worker_memory_limit_mb: Number(
    process.env.PYODIDE_WORKER_MEMORY_LIMIT_MB ?? 256,
  ),
  worker_boot_timeout_ms: Number(
    process.env.PYODIDE_WORKER_BOOT_TIMEOUT_MS ?? 60_000,
  ),
});

try {
  console.log("Initial stats");
  console.log(JSON.stringify(pool.getStats(), null, 2));

  const jobs = await Promise.all([
    pool.execute({
      code: 'print("job 1 stdout")\n1 + 2',
      timeout_ms: 30_000,
    }),
    pool.execute({
      code: 'print("job 2 stdout")\nsum([1, 2, 3, 4])',
      timeout_ms: 30_000,
    }),
    pool.execute({
      code: "name.upper()",
      context: {
        name: "mock stack",
      },
      timeout_ms: 30_000,
    }),
    pool.execute({
      context: {
        request: {
          method: "POST",
          path: "/users/42",
          path_params: {
            id: "42",
          },
          query: {
            tags: ["admin", "tester"],
          },
          body: {
            first_name: "Ada",
            last_name: "Lovelace",
            score: 98,
          },
        },
        globals: {
          execution_count: 7,
        },
      },
      code: `
full_name = request["body"]["first_name"] + " " + request["body"]["last_name"]

{
  "method": request["method"],
  "path": request["path"],
  "id": request["path_params"]["id"],
  "tag_count": len(request["query"]["tags"]),
  "full_name": full_name,
  "next_execution_count": globals["execution_count"] + 1,
  "allowed": request["body"]["score"] > 90,
}
`,
      timeout_ms: 30_000,
    }),
  ]);

  console.log("Results");
  console.log(JSON.stringify(jobs, null, 2));

  console.log("Final stats");
  console.log(JSON.stringify(pool.getStats(), null, 2));
} finally {
  await pool.destroy();
}
