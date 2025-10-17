import { AGENT_VERSION } from "./contracts.js";
import { validateWithContext } from "./validateWithContext.js";

const RN_PATTERNS = [
  /\brelease notes?\b/i, /\bchangelog\b/i, /\brelease(s)?\b/i,
  /\bbetween\s+(?:tag|release)\b/i, /\bwhat changed\b/i
];
const PKT_PATTERNS = [
  /\bknowledge transfer\b/i, /\bkt\b/i, /\bhand(?: |-)?over\b/i,
  /\bauthor\b/i, /\bby\s+(@?[a-z0-9._-]+)/i, /\bcontribution(s)?\b/i
];
const FKT_PATTERNS = [
  /\bfeature(?:-| )?centric\b/i, /\bmodule\b/i, /\bcomponent\b/i,
  /\bfor\s+(?:feature|module)\s+([a-z0-9._-]+)\b/i, /\bfiles?\s+related\b/i
];
const VERSION = /([vV]?\.?\d+(?:\.\d+){1,3})/;

function score(txt, pats) { return pats.reduce((a, re) => a + (re.test(txt) ? 1 : 0), 0); }

function rulePass(prompt) {
  const rn = score(prompt, RN_PATTERNS);
  const pkt = score(prompt, PKT_PATTERNS);
  const fkt = score(prompt, FKT_PATTERNS);
  const total = rn + pkt + fkt;

  let doc_type = "INVALID";
  if (total > 0) {
    doc_type = "RN";
    if (pkt > rn && pkt >= fkt) doc_type = "PKT";
    if (fkt > rn && fkt >= pkt) doc_type = "FKT";
  }

  const extracted = { from_tag: null, to_tag: null, person: null, feature: null };
  const mPerson = prompt.match(/\bby\s+(@?[a-z0-9._-]+)/i);
  if (mPerson) extracted.person = mPerson[1];

  const mFeat = prompt.match(/(?:feature|module)\s+([a-z0-9._-]+)/i);
  if (mFeat) extracted.feature = mFeat[1];

  const tags = prompt.match(new RegExp(VERSION.source, "gi")) || [];
  if (tags.length >= 2) {
    extracted.from_tag = tags[0];
    extracted.to_tag   = tags[1];
  }

  let baseConfidence = doc_type === "INVALID" ? 0.2 : 0.6;
  if (doc_type !== "INVALID") {
    const top = doc_type === "RN" ? rn : doc_type === "PKT" ? pkt : fkt;
    const denom = Math.max(1, rn + pkt + fkt);
    baseConfidence = Math.min(1, 0.6 + 0.4 * (top / denom));
  }

  return { doc_type, extracted, baseConfidence };
}

export async function runPromptCategorizerHybrid(input, contextJSON) {
  const prompt = (input?.prompt || "").trim();

  // Map JSON → validator shape
  const repoContext = {
    tags: (contextJSON?.RN?.releases || []).map(r => r.tag),
    authors: (contextJSON?.PKT?.authors || []).map(a => ({ name: a.name, email: a.email, aliases: [] })),
    features: contextJSON?.FKT?.features || []
  };

  const { doc_type, extracted, baseConfidence } = rulePass(prompt);
  const { extracted: fixed, confidenceBonus } = validateWithContext(doc_type, extracted, repoContext);

  return {
    doc_type,
    confidence: Math.min(1, baseConfidence + confidenceBonus),
    extracted: fixed,
    rationale: `rules(${doc_type}) + context boost ${confidenceBonus.toFixed(2)}`,
    version: AGENT_VERSION
  };
}
