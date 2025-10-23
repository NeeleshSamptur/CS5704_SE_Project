import { AGENT_VERSION, DOC_TYPES } from "./contracts.js";

const GROQ_DEFAULT_MODEL = process.env.GROQ_MODEL || "llama3-8b-8192";
const GROQ_DEFAULT_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const OPENAI_DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function buildContextSnippet(context = {}) {
  const releases = (context?.RN?.releases || []).slice(0, 8);
  const authors = (context?.PKT?.authors || []).slice(0, 12);

  return {
    repoPath: context?.meta?.repoPath || null,
    releases: releases.map((r) => ({ tag: r.tag, date: r.date || null })),
    authors: authors.map((a) => ({ name: a.name, email: a.email || null }))
  };
}

function coerceDocType(value, fallback = "INVALID") {
  if (!value) return fallback;
  const upper = String(value).toUpperCase();
  if (DOC_TYPES.includes(upper)) return upper;
  if (upper === "RELEASE_NOTES") return "RN";
  if (upper === "PERSON_KT" || upper === "PKT") return "PKT";
  return fallback;
}

function clampConfidence(value, fallback = 0.4) {
  const num = Number(value);
  if (Number.isFinite(num)) {
    if (num < 0) return 0;
    if (num > 1) return 1;
    return num;
  }
  return fallback;
}

function sanitizeExtracted(raw = {}) {
  return {
    from_tag: raw.from_tag ?? null,
    to_tag: raw.to_tag ?? null,
    person: raw.person ?? null,
    feature: raw.feature ?? null
  };
}

function parseJsonResponse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```[\s\S]*?```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

const PROVIDER = (() => {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      name: "groq",
      apiKey: groqKey,
      model: process.env.PROMPT_CATEGORIZER_MODEL || GROQ_DEFAULT_MODEL,
      baseUrl: GROQ_DEFAULT_BASE_URL.replace(/\/+$/, "")
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;
  if (openaiKey) {
    return {
      name: "openai",
      apiKey: openaiKey,
      model: process.env.PROMPT_CATEGORIZER_MODEL || OPENAI_DEFAULT_MODEL,
      baseUrl: OPENAI_DEFAULT_BASE_URL.replace(/\/+$/, "")
    };
  }

  return null;
})();

let missingApiKeyWarned = false;

async function callChatCompletion(messages) {
  if (!PROVIDER) {
    if (!missingApiKeyWarned) {
      console.warn("llmNode skipped: no GROQ_API_KEY or OPENAI_API_KEY detected.");
      missingApiKeyWarned = true;
    }
    return null;
  }

  const response = await fetch(`${PROVIDER.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PROVIDER.apiKey}`
    },
    body: JSON.stringify({
      model: PROVIDER.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function runPromptCategorizerLLM({ prompt, repoPath, context, initialObservation }) {
  const trimmedPrompt = (prompt || "").trim();
  if (!trimmedPrompt) return initialObservation;

  try {
    const contextSnippet = buildContextSnippet(context);
    const messages = [
      {
        role: "system",
        content:
          "You are a strict documentation classifier. Return JSON with keys doc_type, confidence, extracted, rationale. " +
          "doc_type must be RN (release notes), PKT (person-centric knowledge transfer), or INVALID. " +
          "Use provided repository context to ground your decision. Only return JSON."
      },
      {
        role: "user",
        content: JSON.stringify({
          prompt: trimmedPrompt,
          repoPath,
          heuristics: initialObservation || null,
          context: contextSnippet,
          instructions: {
            doc_types: {
              RN: "Release notes: focus on changes between tags/releases.",
              PKT: "Person-centric knowledge transfer. Mentions authors, ownership, contributions.",
              INVALID: "Anything else or insufficient info."
            },
            expectations: [
              "Set confidence between 0 and 1.",
              "Fill extracted.from_tag and extracted.to_tag when prompt references tags.",
              "Fill extracted.person when prompt references authors.",
              "Leave fields null when information is missing."
            ]
          }
        }, null, 2)
      }
    ];

    const content = await callChatCompletion(messages);
    if (!content) return initialObservation;

    const parsed = parseJsonResponse(content);
    if (!parsed) throw new Error("LLM did not return valid JSON");

    const doc_type = coerceDocType(parsed.doc_type, initialObservation?.doc_type);
    const confidence = clampConfidence(parsed.confidence, initialObservation?.confidence ?? 0.4);
    const extracted = sanitizeExtracted(parsed.extracted);
    const rationale = parsed.rationale
      ? String(parsed.rationale)
      : `LLM classification (${doc_type})`;

    return {
      doc_type,
      confidence,
      extracted,
      rationale,
      version: `${AGENT_VERSION}:llm-${PROVIDER?.name || "unknown"}`
    };
  } catch (error) {
    console.warn("llmNode fallback failed:", error?.message || error);
    return initialObservation;
  }
}
