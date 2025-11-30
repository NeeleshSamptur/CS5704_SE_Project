import express from "express";
import cors from "cors";
import { buildPromptContext } from "../services/repoContext.mjs";
import { fetchCommitDetails } from "../services/commitDetails.mjs";
import { runCategorizerAgent } from "../graph/categorizer.graph.mjs";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * POST /categorize
 * body: { prompt: string, repoPath: string, refresh?: boolean }
 * - Builds fresh prompt context JSON from local Git (RN/PKT/FKT)
 * - Classifies prompt into RN/PKT/FKT/INVALID
 * - Returns { tool, prompt_context }
 */
app.post("/categorize", async (req, res) => {
  try {
    const { prompt, repoPath, refresh = false } = req.body || {};
    if (!prompt || !repoPath) {
      return res.status(400).json({ ok: false, error: "prompt and repoPath required" });
    }

    console.log("[/categorize] hit", { prompt, repoPath, refresh });

    // 1) Build context JSON & gather commit metadata (fresh each request; optional git fetch)
    const [contextJSON, commitDetails] = await Promise.all([
      buildPromptContext(repoPath),
      // fetchCommitDetails(repoPath)
    ]);

    // console.log("contextjson",contextJSON);

    // console.log("commit",commitDetails)

    // console.log("[/categorize] commit details:", commitDetails.map((c) => ({
    //   commitId: c.commitId,
    //   author: c.author,
    //   releaseTags: c.releaseTags,
    //   message: c.message.split("\n")[0],
    //   diffPreview: c.codeDiff ? `${c.codeDiff.split("\n").slice(0, 5).join("\n")}...` : null
    // })));
    // if (commitDetails.length === (commitLimit || 100)) {
    //   console.log(`[/categorize] commit list truncated to ${commitDetails.length} entries (set commitLimit to adjust).`);
    // }

    // 2) Run hybrid categorizer with that JSON
    const observation = await runCategorizerAgent({ prompt, repoPath, context: contextJSON });
    console.log("observation",observation)
    
    res.json({
      ok: true,
      tool: {
        type: "tool",
        name: "prompt_categorizer",
        input: { prompt, repoPath, refresh },
        observation,
        state_patch: {
          doc_type: observation.doc_type,
          categorizer_extracted: observation.extracted,
          categorizer_confidence: observation.confidence
        }
      },
      prompt_context: contextJSON,
      // commit_details: commitDetails
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

const PORT = process.env.PORT || 8788;
app.listen(PORT, () => console.log(`✅ Backend listening on http://localhost:${PORT}`));
