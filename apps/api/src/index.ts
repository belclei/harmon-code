// apps/api/src/index.ts
import { buildServer } from "./server.js";

const server = await buildServer();
await server.listen({ port: server.env.PORT, host: "0.0.0.0" });
