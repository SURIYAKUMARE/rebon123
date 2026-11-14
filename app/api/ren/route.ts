/**
 * Next.js App Router — POST /api/ren
 * Ren mentor: Gemini → { speech, action } for the AWS console timeline.
 */
import { handleRenMentor } from "../../../server/renMentor";

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
      ? (body as { studentQuery?: unknown; currentRoute?: unknown })
      : {};

  const result = await handleRenMentor(payload, process.env.GEMINI_API_KEY || "");

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data);
}
