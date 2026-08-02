import {
  type IPythonCodeRunner,
  type PythonCodeRunnerInput,
  type PythonCodeRunnerResult,
} from "../../domain/interfaces/python_code_runner";

export const createNoOpPythonCodeRunner = (): IPythonCodeRunner => ({
  execute: async (_input: PythonCodeRunnerInput): Promise<PythonCodeRunnerResult> => {
    throw new Error(
      "Python code execution is not available in this environment. " +
        "A Worker-compatible Python runner has not been wired yet.",
    );
  },
  destroy: async (): Promise<void> => {},
});
