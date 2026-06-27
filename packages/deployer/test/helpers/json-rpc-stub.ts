export type JsonRpcStubConfig = {
  chainId?: number;
  transactionCount?: Record<string, number>;
  bytecode?: Record<string, string | undefined>;
};

type JsonRpcRequest = {
  id?: number | string;
  method?: string;
  params?: unknown[];
};

/** In-process JSON-RPC stub for read-only viem paths (eth_chainId, etc.). */
export function startJsonRpcStub(config: JsonRpcStubConfig = {}): {
  url: string;
  stop: () => void;
} {
  const chainId = config.chainId ?? 84532;
  const transactionCount = config.transactionCount ?? {};
  const bytecode = config.bytecode ?? {};

  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }
      const body = (await request.json()) as JsonRpcRequest;
      const id = body.id ?? 1;
      const method = body.method ?? "";
      let result: unknown;

      switch (method) {
        case "eth_chainId":
          result = `0x${chainId.toString(16)}`;
          break;
        case "eth_getTransactionCount": {
          const address = String((body.params ?? [])[0] ?? "").toLowerCase();
          const count = transactionCount[address] ?? 0;
          result = `0x${count.toString(16)}`;
          break;
        }
        case "eth_getCode": {
          const address = String((body.params ?? [])[0] ?? "").toLowerCase();
          result = bytecode[address] ?? "0x";
          break;
        }
        default:
          return Response.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `unsupported method ${method}` },
          });
      }

      return Response.json({ jsonrpc: "2.0", id, result });
    },
  });

  return {
    url: `http://${server.hostname}:${server.port}`,
    stop: () => {
      server.stop(true);
    },
  };
}
