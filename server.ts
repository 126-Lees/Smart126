// server.ts
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import path from "path";
import fs from "fs";
import awsIot from "aws-iot-device-sdk";
import { config } from "dotenv";
config();

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || "3000", 10);

// ========== Resolve Cert Paths ==========
const certPath = path.resolve(process.cwd(), process.env.AWS_CERT_PATH!);
const keyPath = path.resolve(process.cwd(), process.env.AWS_KEY_PATH!);
const caPath = path.resolve(process.cwd(), process.env.AWS_CA_PATH!);

[
  ["AWS_CERT_PATH", certPath],
  ["AWS_KEY_PATH", keyPath],
  ["AWS_CA_PATH", caPath],
].forEach(([name, filePath]) => {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] ${name} not found at: ${filePath}`);
    process.exit(1);
  }
});

console.log("[IoT] Cert files verified");

// ========== AWS IoT Core ==========
const device = awsIot.device({
  keyPath,
  certPath,
  caPath,
  clientId: process.env.AWS_IOT_CLIENT_ID || "nextjs-listener",
  host: process.env.AWS_IOT_ENDPOINT!,
});

device.on("connect", () => console.log("[IoT] Connected to AWS IoT Core"));
device.on("reconnect", () => console.warn("[IoT] Reconnecting..."));
device.on("offline", () => console.warn("[IoT] Device offline"));
device.on("error", (err: Error) => console.error("[IoT] Error:", err.message));
device.on("close", () => console.log("[IoT] Connection closed"));

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // ===== POST /api/iot/publish =====
    if (req.method === "POST" && req.url?.startsWith("/api/iot/publish")) {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const payload = JSON.parse(body);
          device.publish(
            "smart126/pub",
            JSON.stringify(payload),
            { qos: 1 },
            (err) => {
              if (err) {
                console.error("[IoT] Publish failed:", err.message);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
              } else {
                console.log(
                  "[IoT] Published:",
                  JSON.stringify(payload, null, 2),
                );
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
              }
            },
          );
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    // ===== All other requests → Next.js =====
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // ========== Start Server ==========
  server.listen(port, () => {
    console.log(`✅ Next.js running at  http://localhost:${port}`);
  });

  // ========== Graceful Shutdown ==========
  process.on("SIGINT", () => {
    console.log("\n[EXIT] Shutting down...");
    device.end();
    process.exit(0);
  });

  process.on("uncaughtException", (err) =>
    console.error("[ERROR] Uncaught:", err),
  );
  process.on("unhandledRejection", (reason) =>
    console.error("[ERROR] Unhandled:", reason),
  );
});
