// graph/categorizer.graph.mjs
import { StateGraph } from "@langchain/langgraph";
import { initialState, isConfident, stateChannels } from "./state.mjs";
import { categorizerNode } from "../agents/promptCategorizer.node.js";
import { runPromptCategorizerLLM } from "../agents/llmCategorizer.mjs";
import {
  invalidPromptNode,
  pktMissingPersonNode,
  rnMissingTagsNode,
  pktAgentNode,
  rnAgentNode
} from "../agents/postCategorizer.node.js";

async function llmNode(state = {}) {
  const { prompt, repoPath, context, draft } = state;
  try {
    const observation = await runPromptCategorizerLLM({
      prompt,
      repoPath,
      context,
      initialObservation: draft
    });
    if (observation) {
      return { ...state, draft: observation };
    }
  } catch (error) {
    console.warn("llmNode error:", error?.message || error);
  }
  return state;
}

function finalizeNode(state) {
  return { ...state, final: state.draft };
}

function determineOutcomeNode(state = {}) {
  const observation = state.final || state.draft || {};
  const docType = (observation.doc_type || "").toUpperCase();
  const extracted = observation.extracted || {};

  if (docType === "PKT") {
    return extracted.person ? "pkt_agent" : "pkt_missing_person";
  }

  if (docType === "RN") {
    return extracted.from_tag || extracted.to_tag ? "rn_agent" : "rn_missing_tags";
  }

  return "invalid_prompt";
}

export function buildCategorizerGraph() {
  const g = new StateGraph({ channels: stateChannels })
    .addNode("categorize", categorizerNode)
    .addNode("llm", llmNode)
    .addNode("finalize", finalizeNode)
    .addNode("invalid_prompt", invalidPromptNode)
    .addNode("pkt_missing_person", pktMissingPersonNode)
    .addNode("rn_missing_tags", rnMissingTagsNode)
    .addNode("pkt_agent", pktAgentNode)
    .addNode("rn_agent", rnAgentNode)
    .addEdge("__start__", "categorize")
    .addConditionalEdges("categorize", (s) => isConfident(s.draft) ? "finalize" : "llm", {
      finalize: "finalize",
      llm: "llm"
    })
    .addEdge("llm", "finalize")
    .addConditionalEdges("finalize", determineOutcomeNode, {
      invalid_prompt: "invalid_prompt",
      pkt_missing_person: "pkt_missing_person",
      rn_missing_tags: "rn_missing_tags",
      pkt_agent: "pkt_agent",
      rn_agent: "rn_agent"
    })
    .addEdge("invalid_prompt", "__end__")
    .addEdge("pkt_missing_person", "__end__")
    .addEdge("rn_missing_tags", "__end__")
    .addEdge("pkt_agent", "__end__")
    .addEdge("rn_agent", "__end__");

  return g.compile();
}

export async function runCategorizerAgent({ prompt, repoPath, context }) {
  const app = buildCategorizerGraph();
  const out = await app.invoke(initialState({ prompt, repoPath, context }));
  return out.final; // { doc_type, confidence, extracted, rationale, version }
}
