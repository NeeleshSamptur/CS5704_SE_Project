// // ❌ REMOVE node-fetch import
// // import fetch from "node-fetch";

// // ✔ Node 18+ already has fetch globally

// export async function mistralGenerate({ commits, version, prompt }) {
//   const changelog = commits
//     .map(
//       (c) =>
//         `- (${c.release_tag || "no-tag"}) ${c.message} — @${c.author_name}`
//     )
//     .join("\n");

//   const finalPrompt = `
// You are an expert release-notes generator.

// ### Task
// Generate clean, professional, Mastodon-style release notes.

// ### Version:
// ${version || "Unspecified"}

// ### Commits (${commits.length}):
// ${changelog}

// ### User Prompt:
// ${prompt}

// ### Output Format:
// - Title
// - Upgrade overview
// - Changelog (group into: Added, Fixed, Changed, Security)
// - Upgrade Notes (if applicable)
// - Dependencies (if applicable)
// - Update Steps

// Ensure clarity.

// Now produce the final release notes:
// `;

//   console.log("\n🧠 Sending to Mistral…\n");

//   const response = await fetch("http://127.0.0.1:11434/api/generate", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model: "mistral",
//       prompt: finalPrompt,
//       stream: true
//     })
//   });

//   if (!response.ok) {
//     throw new Error("Mistral request failed");
//   }

//   // ✔ Streaming now works because we use native fetch
//   const reader = response.body.getReader();
//   let fullText = "";

//   while (true) {
//     const { done, value } = await reader.read();
//     if (done) break;

//     const chunk = new TextDecoder().decode(value);

//     for (const line of chunk.split("\n")) {
//       if (!line.trim()) continue;
//       try {
//         const json = JSON.parse(line);
//         if (json.response) fullText += json.response;
//       } catch {}
//     }
//   }

//   return fullText.trim();
// }

// apps/backend/services/mistralGenerate.mjs
import fetch from "node-fetch";

/**
 * Call local Mistral via Ollama to generate release notes
 * using ONLY commit messages (best performance)
 */
export async function mistralGenerate({ commits, version, prompt }) {
  const changelog = commits
    .map(
      (c) =>
        `- ${c.message} (by @${c.author_name || "unknown"})`
    )
    .join("\n");

  const finalPrompt = `
You are an expert technical writer for Visual Studio Code, responsible for generating official, professional release notes. Your goal is to convert granular commit data into a high-level, benefit-driven narrative, mirroring the style and structure of the official VS Code Update pages.

### Task
Generate a polished, narrative-style release notes document based ONLY on the provided commit messages. **Do not use the standard Added/Changed/Fixed structure.** Instead, group related changes into logical, user-facing feature sections.

### Version:
${version || "Unspecified"}

### Source Data (Commits to Analyze):
${changelog}

### User Goal:
${prompt || "Generate high-quality release notes that focus on user benefits and major features."}

### Target Output Style (Mimic Official VS Code Updates):
1.  **Start with a strong welcome and a bulleted list of Key Highlights.** These highlights must be the 8-12 most impactful features/fixes derived from the commits.
2.  **Organize the body of the document into major thematic Headings** (e.g., "GitHub Copilot," "Workbench," "Accessibility," "Terminal," "Languages").
3.  **Under each thematic heading, write narrative paragraphs and/or use bullet points** to describe the new features and improvements. Focus on *what the user gains* (the benefit), not the commit details or internal issue numbers.
4.  **Conclude with a final section for "Engineering" or "Notable Fixes"** for important, high-impact fixes that don't fit into a main feature section.

### Output Structure:
Please begin with the main body content, ensuring a clean and professional tone.

<Start Document Here>
`;

  console.log("\n🧠 Sending to Mistral…");

  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      prompt: finalPrompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Mistral request failed: ${response.status}`);
  }

  const data = await response.json();

  return (data?.response || "").trim();
}
