import { createRequire } from "node:module";
import { dirname } from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import { loadPyodide, type PyodideInterface } from "pyodide";

import type {
  PyodideWorkerData,
  PyodideWorkerError,
  PyodideWorkerInboundMessage,
  PyodideWorkerOutboundMessage,
} from "./index";

const port = parentPort;

if (!port) {
  throw new Error("Pyodide worker must be started as a worker thread");
}

const data = workerData as PyodideWorkerData;
const require = createRequire(import.meta.url);

let pyodide: PyodideInterface;
let stdout: string[] = [];
let stderr: string[] = [];

const send = (message: PyodideWorkerOutboundMessage): void => {
  port.postMessage(message);
};

const serializeError = (error: unknown): PyodideWorkerError => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "Error",
    message: String(error),
    stack: undefined,
  };
};

const toSerializableValue = (value: unknown): unknown => {
  if (
    value &&
    typeof value === "object" &&
    "toJs" in value &&
    typeof value.toJs === "function"
  ) {
    try {
      return value.toJs();
    } finally {
      if ("destroy" in value && typeof value.destroy === "function") {
        value.destroy();
      }
    }
  }

  return value;
};

const destroyPyProxy = (value: unknown): void => {
  if (
    value &&
    typeof value === "object" &&
    "destroy" in value &&
    typeof value.destroy === "function"
  ) {
    value.destroy();
  }
};

const boot = async (): Promise<void> => {
  pyodide = await loadPyodide({
    indexURL: data.pyodide_index_url ?? getLocalPyodideIndexUrl(),
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });

  if (data.python_packages.length) {
    await pyodide.loadPackage(data.python_packages);
  }

  send({
    type: "ready",
    worker_id: data.worker_id,
  });
};

const getLocalPyodideIndexUrl = (): string => {
  return `${dirname(require.resolve("pyodide/package.json"))}/`;
};

port.on("message", async (message: PyodideWorkerInboundMessage) => {
  if (message.type !== "execute") return;

  const started_at = Date.now();
  stdout = [];
  stderr = [];

  let globals: any;

  try {
    if (message.input.load_packages_from_imports) {
      await pyodide.loadPackagesFromImports(message.input.code);
    }

    const execution_context = message.input.context ?? {};
    const context = {
      ...execution_context,
      execution_context,
    };

    globals = pyodide.toPy(context);

    const script_result = await pyodide.runPythonAsync(message.input.code, {
      ...(globals ? { globals } : {}),
    });
    const has_main = Boolean(
      await pyodide.runPythonAsync('callable(globals().get("main"))', {
        ...(globals ? { globals } : {}),
      }),
    );
    const result = has_main
      ? await pyodide.runPythonAsync("main(execution_context)", {
          ...(globals ? { globals } : {}),
        })
      : script_result;

    if (has_main) {
      destroyPyProxy(script_result);
    }

    send({
      type: "result",
      request_id: message.request_id,
      result: toSerializableValue(result),
      stdout,
      stderr,
      execution_time_ms: Date.now() - started_at,
    });
  } catch (error) {
    send({
      type: "error",
      request_id: message.request_id,
      error: serializeError(error),
      stdout,
      stderr,
      execution_time_ms: Date.now() - started_at,
    });
  } finally {
    globals?.destroy?.();
  }
});

void boot().catch((error) => {
  send({
    type: "ready_error",
    worker_id: data.worker_id,
    error: serializeError(error),
  });
});
