import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";

const client = new IoTDataPlaneClient({
  region: process.env.AWS_REGION!,
  endpoint: `https://${process.env.AWS_IOT_ENDPOINT!}`,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await client.send(
      new PublishCommand({
        topic: "smart126/pub",
        payload: Buffer.from(JSON.stringify(payload)),
        qos: 1,
      }),
    );

    console.log("[IoT] Published:", JSON.stringify(payload, null, 2));
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[IoT] Publish failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
