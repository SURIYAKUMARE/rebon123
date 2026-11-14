import { handleSarvamTts, type SarvamTtsRequest } from "../server/sarvamTts";

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: (body?: string) => void;
};

/** Production: POST /api/sarvam-tts — requires SARVAM_API_KEY (server env). */
export default async function handler(
  req: ApiRequest,
  res: ApiResponse
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const key = process.env.SARVAM_API_KEY || "";
  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      body = {};
    }
  }
  if (typeof body !== "object" || body === null) body = {};

  const result = await handleSarvamTts(body as SarvamTtsRequest, key);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.status(result.status).end(result.body);
}
