/**
 * Next.js App Router — POST /api/knowledge
 * Two-tier: Primary cache → Gemini fallback → Secondary staging.
 */
import { handleKnowledgeOrchestrator } from "../../../server/knowledgeOrchestrator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload =
    typeof body === "object" && body !== null
      ? (body as Parameters<typeof handleKnowledgeOrchestrator>[0])
      : ({} as Parameters<typeof handleKnowledgeOrchestrator>[0]);

  const result = await handleKnowledgeOrchestrator(
    payload,
    process.env.GEMINI_API_KEY || ""
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    ...result.data,
    cache_hit: result.cache_hit,
    staging: "staging" in result ? result.staging : undefined,
  });
}
