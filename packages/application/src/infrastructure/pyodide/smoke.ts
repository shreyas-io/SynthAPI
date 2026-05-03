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
  ]);

  console.log("Results");
  console.log(JSON.stringify(jobs, null, 2));

  console.log("Final stats");
  console.log(JSON.stringify(pool.getStats(), null, 2));
} finally {
  await pool.destroy();
}
