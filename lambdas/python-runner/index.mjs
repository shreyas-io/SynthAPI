import { loadPyodide } from "pyodide";

// The pyodide npm package ships the WASM files next to its entry point.
const INDEX_URL = new URL("./node_modules/pyodide/", import.meta.url).pathname;

let pyodidePromise;

const getPyodide = () => {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({ indexURL: INDEX_URL });
  }
  return pyodidePromise;
};

const INTERNAL_MAIN_FN = "__synthapi_main__";

const wrapScriptAsMain = (code) => {
  const indented_code = code
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");

  return `def ${INTERNAL_MAIN_FN}(execution_context):\n${indented_code}\n`;
};

const captureStreams = (py) => {
  const stdout = [];
  const stderr = [];

  if (typeof py.setStdout === "function") {
    py.setStdout({ batched: (line) => stdout.push(String(line)) });
  }
  if (typeof py.setStderr === "function") {
    py.setStderr({ batched: (line) => stderr.push(String(line)) });
  }

  return { stdout, stderr };
};

const toSerializableValue = (value) => {
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

export const handler = async (event) => {
  const {
    code,
    max_exec_time_ms = 5000,
    context = {},
  } = event;

  if (!code || typeof code !== "string") {
    return {
      errorMessage: "Missing or invalid 'code' field.",
      errorType: "ValidationError",
    };
  }

  try {
    const py = await getPyodide();
    const { stdout, stderr } = captureStreams(py);

    const globals = py.toPy({ ...context, execution_context: context });

    const start = Date.now();
    await Promise.race([
      py.runPythonAsync(wrapScriptAsMain(code), { globals }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Python execution timed out")),
          max_exec_time_ms,
        ),
      ),
    ]);

    const rawResult = await py.runPythonAsync(
      `${INTERNAL_MAIN_FN}(execution_context)`,
      { globals },
    );
    const result = toSerializableValue(rawResult);
    const execution_time_ms = Date.now() - start;

    return {
      result,
      stdout,
      stderr,
      execution_time_ms,
    };
  } catch (err) {
    return {
      errorMessage: err instanceof Error ? err.message : String(err),
      errorType: err instanceof Error ? err.name : "Error",
      stdout: [],
      stderr: [],
    };
  }
};
