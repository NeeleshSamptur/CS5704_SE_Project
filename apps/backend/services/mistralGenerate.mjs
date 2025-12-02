// apps/backend/services/mistralGenerate.mjs
import fetch from "node-fetch";

/**
 * Call local Mistral via Ollama to generate release notes
 */
export async function mistralGenerate({ commits, version, prompt }) {
  const changelog = commits
    .map(
      (c) =>
        `- (${c.release_tag || "no-tag"}) ${c.message} — @${c.author_name}`
    )
    .join("\n");

  const finalPrompt = `
You are an expert release-notes generator.

### Task
Generate clean, professional, Mastodon-style release notes.

### Version:
${version || "Unspecified"}

### Commits (${commits.length}):
${changelog}

### User Prompt:
${prompt}

### Output Format:
- Title
- Upgrade overview
- Changelog (group into: Added, Fixed, Changed, Security)
- Upgrade Notes (if applicable)
- Dependencies (if applicable)
- Update Steps

Ensure clarity, high quality writing, and correct grouping.

Now produce the final release notes:
`;

  console.log("\n🧠 Sending to Mistral…\n");

  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      prompt: finalPrompt,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error("Mistral request failed");
  }

  const reader = response.body.getReader();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = new TextDecoder().decode(value);

    chunk
      .split("\n")
      .filter(Boolean)
      .forEach((line) => {
        try {
          const json = JSON.parse(line);
          if (json.response) fullText += json.response;
        } catch (err) {
          // ignore streaming parse errors
        }
      });
  }

  return fullText.trim();
}
