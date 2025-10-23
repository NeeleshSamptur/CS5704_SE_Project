// graph/categorizer.graph.mjs
import { StateGraph } from "@langchain/langgraph";
import { initialState, isConfident, stateChannels } from "./state.mjs";
import { categorizerNode } from "../agents/promptCategorizer.node.js";
import { runPromptCategorizerLLM } from "../agents/llmCategorizer.mjs";

async function llmNode(state = {}) {
  const { prompt, repoPath, context, draft } = state;
  console.log("[llmNode] incoming draft:", {
    doc_type: draft?.doc_type,
    confidence: draft?.confidence
  });
  try {
    const observation = await runPromptCategorizerLLM({
      prompt,
      repoPath,
      context,
      initialObservation: draft
    });
    if (observation) {
      console.log("[llmNode] llm observation:", {
        doc_type: observation.doc_type,
        confidence: observation.confidence,
        provider_version: observation.version
      });
      return { ...state, draft: observation };
    }
  } catch (error) {
    console.warn("llmNode error:", error?.message || error);
  }
  return state;
}

function finalizeNode(state) {
  console.log("[finalizeNode] finalizing observation:", {
    doc_type: state?.draft?.doc_type,
    confidence: state?.draft?.confidence
  });
  return { ...state, final: state.draft };
}

export function buildCategorizerGraph() {
  const g = new StateGraph({ channels: stateChannels })
    .addNode("categorize", categorizerNode)
    .addNode("llm", llmNode)
    .addNode("finalize", finalizeNode)
    .addEdge("__start__", "categorize")
    .addConditionalEdges("categorize", (s) => isConfident(s.draft) ? "finalize" : "llm", {
      finalize: "finalize",
      llm: "llm"
    })
    .addEdge("llm", "finalize")
    .addEdge("finalize", "__end__");

  return g.compile();
}

export async function runCategorizerAgent({ prompt, repoPath, context }) {
  const app = buildCategorizerGraph();
  const out = await app.invoke(initialState({ prompt, repoPath, context }));
  return out.final; // { doc_type, confidence, extracted, rationale, version }
}
