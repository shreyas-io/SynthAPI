import { Worker } from "node:worker_threads";

type PyodideWorkerPoolConfig = {
  size: number;
  max_queue_size?: number;
  worker_memory_limit_mb?: number;
  worker_boot_timeout_ms?: number;
  python_packages?: string[];
  pyodide_index_url?: string;
};

type PyodideExecutionInput = {
  code: string;
  context?: Record<string, unknown>;
  timeout_ms: number;
  load_packages_from_imports?: boolean;
};

type PyodideExecutionResult = {
  result: unknown;
  stdout: string[];
  stderr: string[];
  execution_time_ms: number;
  worker_id: number;
};

export type PyodideWorkerData = {
  worker_id: number;
  python_packages: string[];
  pyodide_index_url?: string;
};

export type PyodideWorkerInboundMessage = {
  type: "execute";
  request_id: number;
  input: PyodideExecutionInput;
};

export type PyodideWorkerOutboundMessage =
  | {
      type: "ready";
      worker_id: number;
    }
  | {
      type: "ready_error";
      worker_id: number;
      error: PyodideWorkerError;
    }
  | {
      type: "result";
      request_id: number;
      result: unknown;
      stdout: string[];
      stderr: string[];
      execution_time_ms: number;
    }
  | {
      type: "error";
      request_id: number;
      error: PyodideWorkerError;
      stdout: string[];
      stderr: string[];
      execution_time_ms: number;
    };

export type PyodideWorkerError = {
  name: string;
  message: string;
  stack?: string;
};

type QueuedRequest = {
  id: number;
  input: PyodideExecutionInput;
  resolve: (result: PyodideExecutionResult) => void;
  reject: (error: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
};

type PoolWorker = {
  id: number;
  worker: Worker;
  state: "starting" | "idle" | "busy" | "terminated";
  current?: QueuedRequest;
  boot_timeout?: ReturnType<typeof setTimeout>;
};

export const createPyodideWorkerPool = (config: PyodideWorkerPoolConfig) => {
  return new PyodideWorkerPool(config);
};

export class PyodideWorkerPool {
  private readonly config: Required<
    Omit<
      PyodideWorkerPoolConfig,
      "worker_memory_limit_mb" | "pyodide_index_url"
    >
  > &
    Pick<
      PyodideWorkerPoolConfig,
      "worker_memory_limit_mb" | "pyodide_index_url"
    >;
  private readonly workers = new Map<number, PoolWorker>();
  private readonly queue: QueuedRequest[] = [];
  private request_id = 0;
  private closed = false;

  constructor(config: PyodideWorkerPoolConfig) {
    if (!Number.isInteger(config.size) || config.size < 1) {
      throw new Error("Pyodide worker pool size must be at least 1");
    }

    if (config.max_queue_size !== undefined && config.max_queue_size < 1) {
      throw new Error("Pyodide worker pool max_queue_size must be at least 1");
    }

    if (
      config.worker_memory_limit_mb !== undefined &&
      config.worker_memory_limit_mb < 28
    ) {
      throw new Error(
        "Pyodide worker pool worker_memory_limit_mb must be at least 28",
      );
    }

    this.config = {
      size: config.size ?? 1,
      max_queue_size: config.max_queue_size ?? 100,
      worker_memory_limit_mb: config.worker_memory_limit_mb ?? 28,
      worker_boot_timeout_ms: config.worker_boot_timeout_ms ?? 10_000,
      python_packages: config.python_packages ?? [],
      pyodide_index_url: config.pyodide_index_url,
    };

    for (let worker_id = 0; worker_id < this.config.size; worker_id += 1) {
      this.spawnWorker(worker_id);
    }
  }

  execute(input: PyodideExecutionInput): Promise<PyodideExecutionResult> {
    if (this.closed) {
      return Promise.reject(new Error("Pyodide worker pool is closed"));
    }

    if (!input.code.trim()) {
      return Promise.reject(new Error("Python code cannot be empty"));
    }

    if (this.queue.length >= this.config.max_queue_size) {
      return Promise.reject(new Error("Pyodide worker pool queue is full"));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        id: this.request_id,
        input,
        resolve,
        reject,
      });
      this.request_id += 1;
      this.dispatch();
    });
  }

  getStats() {
    return {
      size: this.config.size,
      queued: this.queue.length,
      workers: Array.from(this.workers.values()).map((worker) => ({
        id: worker.id,
        state: worker.state,
      })),
    };
  }

  async destroy(): Promise<void> {
    this.closed = true;

    while (this.queue.length) {
      this.queue.shift()?.reject(new Error("Pyodide worker pool is closed"));
    }

    await Promise.all(
      Array.from(this.workers.values()).map(async (worker) => {
        this.rejectCurrent(worker, new Error("Pyodide worker pool is closed"));
        this.clearWorkerBootTimeout(worker);
        worker.state = "terminated";
        await worker.worker.terminate();
      }),
    );

    this.workers.clear();
  }

  private spawnWorker(worker_id: number): void {
    const worker_url = new URL(
      import.meta.url.endsWith(".ts") ? "./worker.ts" : "./worker.js",
      import.meta.url,
    );

    const worker = new Worker(worker_url, {
      workerData: {
        worker_id,
        python_packages: this.config.python_packages,
        pyodide_index_url: this.config.pyodide_index_url,
      } satisfies PyodideWorkerData,
      resourceLimits: this.config.worker_memory_limit_mb
        ? {
            maxOldGenerationSizeMb: this.config.worker_memory_limit_mb,
          }
        : undefined,
    });

    const pool_worker: PoolWorker = {
      id: worker_id,
      worker,
      state: "starting",
    };

    this.workers.set(worker_id, pool_worker);

    pool_worker.boot_timeout = setTimeout(() => {
      this.handleWorkerFailure(
        pool_worker,
        new Error(
          `Pyodide worker did not boot within ${this.config.worker_boot_timeout_ms}ms`,
        ),
      );
      void worker.terminate();
    }, this.config.worker_boot_timeout_ms);

    worker.on("message", (message: PyodideWorkerOutboundMessage) => {
      this.handleWorkerMessage(pool_worker, message);
    });

    worker.on("error", (error) => {
      this.handleWorkerFailure(pool_worker, error);
    });

    worker.on("exit", (code) => {
      if (code !== 0 || (!this.closed && pool_worker.state !== "terminated")) {
        this.handleWorkerFailure(
          pool_worker,
          new Error(`Pyodide worker exited with code ${code}`),
        );
      }
    });
  }

  private handleWorkerMessage(
    worker: PoolWorker,
    message: PyodideWorkerOutboundMessage,
  ): void {
    if (this.workers.get(worker.id) !== worker) return;

    if (message.type === "ready") {
      this.clearWorkerBootTimeout(worker);
      worker.state = "idle";
      this.dispatch();
      return;
    }

    if (message.type === "ready_error") {
      this.handleWorkerFailure(worker, workerErrorToError(message.error));
      return;
    }

    const request = worker.current;
    if (!request || request.id !== message.request_id) return;

    this.clearRequestTimeout(request);
    worker.current = undefined;
    worker.state = "idle";

    if (message.type === "result") {
      request.resolve({
        result: message.result,
        stdout: message.stdout,
        stderr: message.stderr,
        execution_time_ms: message.execution_time_ms,
        worker_id: worker.id,
      });
    } else {
      request.reject(workerErrorToError(message.error));
    }

    this.dispatch();
  }

  private handleWorkerFailure(worker: PoolWorker, error: Error): void {
    if (this.workers.get(worker.id) !== worker) return;

    const was_starting = worker.state === "starting";
    this.clearWorkerBootTimeout(worker);
    this.rejectCurrent(worker, error);
    worker.state = "terminated";
    this.workers.delete(worker.id);

    if (!this.closed && !was_starting) {
      this.spawnWorker(worker.id);
    }

    if (!this.closed && this.workers.size === 0) {
      this.rejectQueued(error);
    }
  }

  private dispatch(): void {
    for (const worker of this.workers.values()) {
      if (worker.state !== "idle") continue;

      const request = this.queue.shift();
      if (!request) return;

      worker.state = "busy";
      worker.current = request;

      if (request.input.timeout_ms) {
        request.timeout = setTimeout(() => {
          if (worker.current?.id !== request.id) return;

          this.rejectCurrent(
            worker,
            new Error(
              `Pyodide execution timed out after ${request.input.timeout_ms}ms`,
            ),
          );
          worker.state = "terminated";
          this.workers.delete(worker.id);
          void worker.worker.terminate();

          if (!this.closed) {
            this.spawnWorker(worker.id);
          }
        }, request.input.timeout_ms);
      }

      worker.worker.postMessage({
        type: "execute",
        request_id: request.id,
        input: request.input,
      } satisfies PyodideWorkerInboundMessage);
    }
  }

  private rejectCurrent(worker: PoolWorker, error: Error): void {
    if (!worker.current) return;

    this.clearRequestTimeout(worker.current);
    worker.current.reject(error);
    worker.current = undefined;
  }

  private clearRequestTimeout(request: QueuedRequest): void {
    if (request.timeout) clearTimeout(request.timeout);
  }

  private clearWorkerBootTimeout(worker: PoolWorker): void {
    if (worker.boot_timeout) clearTimeout(worker.boot_timeout);
  }

  private rejectQueued(error: Error): void {
    while (this.queue.length) {
      this.queue.shift()?.reject(error);
    }
  }
}

const workerErrorToError = (error: PyodideWorkerError): Error => {
  const result = new Error(error.message);
  result.name = error.name;
  result.stack = error.stack;
  return result;
};
