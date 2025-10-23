// graph/state.mjs
export const stateChannels = {
  prompt: null,
  repoPath: null,
  context: null,
  draft: null,
  final: null
};

export const initialState = ({ prompt, repoPath, context }) => ({
  prompt,
  repoPath,
  context, // your RN/PKT context JSON
  draft: null, // where nodes write their tentative result
  final: null // frozen result returned by the graph
});

export function isConfident(draft, threshold = 0.85) {
  return !!draft && Number(draft.confidence || 0) >= threshold;
}
  
