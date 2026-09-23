import Groq from "groq-sdk";
import type { z } from "zod";

/**
 * Asking Groq for JSON, and not trusting the answer.
 *
 * Structured outputs run in best-effort mode on these models: the schema is a
 * strong hint, not a guarantee. So everything that comes back is parsed and
 * validated against the caller's Zod schema, with one retry that points out
 * the failure, before any of it reaches the database.
 */
export class GroqError extends Error {}

/** The only Groq model that accepts images. */
export const VISION_MODEL = "qwen/qwen3.8-27b";
/** For text — the contents of a PDF, or a page from a portal. */
export const TEXT_MODEL = "openai/gpt-oss-120b";

export function groqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new GroqError(
      "Reading images and PDFs needs a GROQ_API_KEY in .env.local. A calendar link or .ics file works without one.",
    );
  }
  return new Groq();
}

export async function askGroqJson<T>({
  client,
  model,
  messages,
  schema,
  jsonSchema,
  name,
  attempt = 1,
}: {
  client: Groq;
  model: string;
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[];
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  name: string;
  attempt?: number;
}): Promise<T> {
  let raw: string | null | undefined;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0,
      max_completion_tokens: 8000,
      response_format: { type: "json_schema", json_schema: { name, schema: jsonSchema } },
    });
    raw = completion.choices[0]?.message?.content;
  } catch (error) {
    throw asGroqError(error);
  }

  if (!raw) throw new GroqError("The model returned nothing to read.");

  const parsed = parseJson(raw, schema);
  if (parsed) return parsed;

  // Valid JSON in the wrong shape. One retry with the failure pointed out is
  // cheap and usually enough.
  if (attempt === 1) {
    return askGroqJson({
      client,
      model,
      schema,
      jsonSchema,
      name,
      attempt: 2,
      messages: [
        ...messages,
        { role: "assistant", content: raw },
        {
          role: "user",
          content:
            "That did not match the required schema. Return only the JSON object, with every required field present.",
        },
      ],
    });
  }

  throw new GroqError("Could not read that file. A straight-on, uncropped image reads best.");
}

function parseJson<T>(raw: string, schema: z.ZodType<T>): T | null {
  // Some models still wrap JSON in a markdown fence despite being told not to.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return null;
  }

  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}

export function asGroqError(error: unknown): GroqError {
  if (error instanceof GroqError) return error;
  if (error instanceof Groq.AuthenticationError) {
    return new GroqError("That GROQ_API_KEY was rejected.");
  }
  if (error instanceof Groq.RateLimitError) {
    return new GroqError("Groq rate limited the request. Try again shortly.");
  }
  if (error instanceof Groq.BadRequestError) {
    return new GroqError(`Groq rejected the request: ${error.message}`);
  }
  if (error instanceof Groq.APIConnectionError) {
    return new GroqError("Could not reach Groq.");
  }
  if (error instanceof Groq.APIError) {
    return new GroqError(`Groq returned ${error.status}.`);
  }
  return new GroqError("Could not read that file.");
}
