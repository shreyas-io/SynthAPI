export type PythonCodeRunnerInput = {
  code: string;
  max_exec_time_ms?: number;
  context?: Record<string, unknown>;
};

export type PythonCodeRunnerResult = {
  result: unknown;
  stdout: string[];
  stderr: string[];
  execution_time_ms: number;
};

export interface IPythonCodeRunner {
  execute(input: PythonCodeRunnerInput): Promise<PythonCodeRunnerResult>;
  destroy(): Promise<void>;
}
