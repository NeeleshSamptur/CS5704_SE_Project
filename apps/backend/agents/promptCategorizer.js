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
// const FKT_PATTERNS = [
//   /\bfeature(?:-| )?centric\b/i, /\bmodule\b/i, /\bcomponent\b/i,
//   /\bfor\s+(?:feature|module)\s+([a-z0-9._-]+)\b/i, /\bfiles?\s+related\b/i
// ];
const VERSION = /([vV]?\.?\d+(?:\.\d+){1,3})/;

function score(txt, pats) { return pats.reduce((a, re) => a + (re.test(txt) ? 1 : 0), 0); }

function rulePass(prompt) {
  const rn = score(prompt, RN_PATTERNS);
  const pkt = score(prompt, PKT_PATTERNS);
  // const fkt = score(prompt, FKT_PATTERNS);
  const total = rn + pkt; // feature-centric KT disabled

  let doc_type = "INVALID";
  if (total > 0) {
    doc_type = "RN";
    if (pkt > rn /* && pkt >= fkt */) doc_type = "PKT";
    // if (fkt > rn && fkt >= pkt) doc_type = "FKT";
  }

  const extracted = { from_tag: null, to_tag: null, person: null };
  const mPerson = prompt.match(/\bby\s+(@?[a-z0-9._-]+)/i);
  if (mPerson) extracted.person = mPerson[1];

  // const mFeat = prompt.match(/(?:feature|module)\s+([a-z0-9._-]+)/i);
  // if (mFeat) extracted.feature = mFeat[1];

  const tags = prompt.match(new RegExp(VERSION.source, "gi")) || [];
  if (tags.length >= 2) {
    extracted.from_tag = tags[0];
    extracted.to_tag   = tags[1];
  }

  const top = doc_type === "RN" ? rn : doc_type === "PKT" ? pkt : 0; // feature-centric KT disabled
  const denom = Math.max(1, total /* + fkt */);
  const ruleStrength = denom > 0 ? top / denom : 0;
  const ruleConfidence = doc_type === "INVALID" ? 0.2 : Math.min(1, 0.2 + 0.8 * ruleStrength);

  return { doc_type, extracted, ruleConfidence, ruleStrength };
}

export async function runPromptCategorizerHybrid(input, contextJSON) {
  const prompt = (input?.prompt || "").trim();
  // Map JSON → validator shape
  const repoContext = {
    tags: (contextJSON?.RN?.releases || []).map(r => r.tag),
    authors: (contextJSON?.PKT?.authors || []).map(a => {
      const cleanName = a.name.replace(/\s*<.*>/, ""); // removes " <email>"
      return { name: cleanName, email: a.email, aliases: [] };
    })
    // features: contextJSON?.FKT?.features || []
  };


  const { doc_type, extracted, ruleConfidence, ruleStrength } = rulePass(prompt);
  const { extracted: fixed, contextConfidence } = validateWithContext(doc_type, extracted, repoContext);

  let confidence = ruleConfidence;
  if (doc_type !== "INVALID") {
    const combinedScore = (ruleStrength + contextConfidence) / 2;
    confidence = Math.min(1, 0.2 + 0.8 * combinedScore);
  }

  const rationale = doc_type === "INVALID"
    ? "rules → INVALID"
    : `rules ${(ruleStrength * 100).toFixed(0)}% + context ${(contextConfidence * 100).toFixed(0)}% ⇒ combined ${(confidence * 100).toFixed(0)}%`;

  return {
    doc_type,
    confidence,
    extracted: fixed,
    rationale,
    version: AGENT_VERSION
  };
}
