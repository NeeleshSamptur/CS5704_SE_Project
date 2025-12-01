import {
  fetchAllCommits,
  fetchCommitsByAuthor,
  fetchCommitsByReleaseTags
} from "../services/commitDetails.mjs";

function baseFinal(state) {
  return state.final || state.draft || {};
}

function withFinal(state, patch) {
  return {
    ...state,
    final: {
      ...baseFinal(state),
      ...patch
    }
  };
}

export function invalidPromptNode(state = {}) {
  return withFinal(state, {
    notification: {
      type: "error",
      message: "Your prompt is invalid. Please try a different request."
    }
  });
}

export function pktMissingPersonNode(state = {}) {
  return withFinal(state, {
    notification: {
      type: "error",
      message: "The requested author was not found in this repository."
    }
  });
}

export function rnMissingTagsNode(state = {}) {
  return withFinal(state, {
    notification: {
      type: "error",
      message: "The requested release version does not exist in this repository."
    }
  });
}

export async function pktAgentNode(state = {}) {
  const observation = baseFinal(state);
  const person = observation?.extracted?.person;
  const commits = person ? await fetchCommitsByAuthor(person) : await fetchAllCommits();
  return withFinal(state, {
    nextAgent: "PKT",
    commits
  });
}

export async function rnAgentNode(state = {}) {
  const observation = baseFinal(state);
  const tags = [observation?.extracted?.from_tag, observation?.extracted?.to_tag].filter(Boolean);
  const commits = tags.length > 0
    ? await fetchCommitsByReleaseTags(tags)
    : await fetchAllCommits();
  return withFinal(state, {
    nextAgent: "RN",
    commits
  });
}
