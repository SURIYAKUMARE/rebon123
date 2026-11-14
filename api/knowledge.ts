/**
 * Vercel serverless — POST /api/knowledge
 * Two-tier lookup: Primary cache → Gemini fallback → Secondary staging payload.
 */
import { handleKnowledgeOrchestrator } from "../server/knowledgeOrchestrator";

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

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

  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      body = {};
    }
  }
  if (typeof body !== "object" || body === null) body = {};

  const result = await handleKnowledgeOrchestrator(
    body as Parameters<typeof handleKnowledgeOrchestrator>[0],
    process.env.GEMINI_API_KEY || ""
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(200).json({
    ...result.data,
    cache_hit: result.cache_hit,
    staging: "staging" in result ? result.staging : undefined,
  });
}
