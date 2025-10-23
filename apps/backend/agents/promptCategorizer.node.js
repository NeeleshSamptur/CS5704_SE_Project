import { runPromptCategorizerHybrid } from "./promptCategorizer.js";

/**
 * LangGraph node that runs the hybrid prompt categorizer and writes
 * the observation into `state.draft` for downstream nodes to consume.
 */
export async function categorizerNode(state = {}) {
  const { prompt = "", repoPath = "", context } = state;

  try {
    const observation = await runPromptCategorizerHybrid({ prompt, repoPath }, context);
    console.log("[categorizerNode] heuristic observation:", {
      doc_type: observation?.doc_type,
      confidence: observation?.confidence,
      extracted: observation?.extracted
    });
    return { ...state, draft: observation };
  } catch (error) {
    const message = error?.message || String(error);
    console.error("categorizerNode failed:", message);

    return {
      ...state,
      draft: {
        doc_type: "INVALID",
        confidence: 0,
        extracted: {},
        rationale: `categorizerNode error: ${message}`,
        version: "error"
      }
    };
  }
}
