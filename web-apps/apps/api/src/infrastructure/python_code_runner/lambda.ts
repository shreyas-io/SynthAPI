import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

import type {
  IPythonCodeRunner,
  PythonCodeRunnerInput,
  PythonCodeRunnerResult,
} from "../../domain/interfaces/python_code_runner";

export type LambdaPythonRunnerConfig = {
  functionName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  timeoutMs?: number;
};

export const createLambdaPythonCodeRunner = (
  config: LambdaPythonRunnerConfig,
): IPythonCodeRunner => {
  const client = new LambdaClient({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async execute(
      input: PythonCodeRunnerInput,
    ): Promise<PythonCodeRunnerResult> {
      const response = await client.send(
        new InvokeCommand({
          FunctionName: config.functionName,
          InvocationType: "RequestResponse",
          Payload: JSON.stringify({
            code: input.code,
            max_exec_time_ms: input.max_exec_time_ms,
            context: input.context,
          }),
        }),
      );

      const payload = response.Payload
        ? (JSON.parse(new TextDecoder().decode(response.Payload)) as unknown)
        : null;

      if (response.FunctionError) {
        throw new Error(
          `Python runner Lambda failed: ${(payload as { errorMessage?: string } | null)?.errorMessage ?? response.FunctionError}`,
        );
      }

      if (!payload || typeof payload !== "object") {
        throw new Error("Python runner Lambda returned an invalid payload");
      }

      return payload as PythonCodeRunnerResult;
    },
    async destroy(): Promise<void> {
      client.destroy();
    },
  };
};
