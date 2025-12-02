import express from "express";
import cors from "cors";
import { buildPromptContext } from "../services/repoContext.mjs";
import { runCategorizerAgent } from "../graph/categorizer.graph.mjs";
import fs from 'fs';

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

    // 1) Build context JSON (fresh each request; optional git fetch)
    const contextJSON = await buildPromptContext(repoPath);

    // 2) Run hybrid categorizer with that JSON
    const observation = await runCategorizerAgent({ prompt, repoPath, context: contextJSON });
    // console.log("observation", observation);
    fs.writeFileSync(
      './observation_output.json',     
      JSON.stringify(observation, null, 2),   // pretty print
      'utf-8'
    );

    if (observation?.notification) {
      return res.json({
        ok: false,
        message: observation.notification.message,
        doc_type: observation.doc_type,
        extracted: observation.extracted
      });
    }

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
          categorizer_confidence: observation.confidence,
          next_agent: observation.nextAgent || null
        }
      },
      prompt_context: contextJSON
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

const PORT = process.env.PORT || 8788;
app.listen(PORT, () => console.log(`✅ Backend listening on http://localhost:${PORT}`));



// // apps/backend/server/index.mjs
// import express from "express";
// import cors from "cors";
// import { buildPromptContext } from "../services/repoContext.mjs";
// import { runCategorizerAgent } from "../graph/categorizer.graph.mjs";
// import { mistralGenerate } from "../services/mistralGenerate.mjs";

// const app = express();
// app.use(cors());
// app.use(express.json({ limit: "5mb" }));

// app.get("/health", (_req, res) => res.json({ ok: true }));

// /**
//  * -------------------------------
//  *  🔥 PROMPT CATEGORIZER ENDPOINT
//  * -------------------------------
//  */
// app.post("/categorize", async (req, res) => {
//   try {
//     const { prompt, repoPath, refresh = false } = req.body || {};

//     if (!prompt || !repoPath) {
//       return res.status(400).json({
//         ok: false,
//         error: "prompt and repoPath required"
//       });
//     }

//     console.log("[/categorize] hit", { prompt, repoPath, refresh });

//     const contextJSON = await buildPromptContext(repoPath);

//     const observation = await runCategorizerAgent({
//       prompt,
//       repoPath,
//       context: contextJSON
//     });

//     console.log("observation", observation);

//     if (observation?.notification) {
//       return res.json({
//         ok: false,
//         message: observation.notification.message,
//         doc_type: observation.doc_type,
//         extracted: observation.extracted
//       });
//     }

//     return res.json({
//       ok: true,
//       tool: {
//         type: "tool",
//         name: "prompt_categorizer",
//         observation,
//         state_patch: {
//           doc_type: observation.doc_type,
//           categorizer_extracted: observation.extracted,
//           categorizer_confidence: observation.confidence,
//           next_agent: observation.nextAgent || null
//         }
//       },
//       prompt_context: contextJSON
//     });
//   } catch (err) {
//     return res.status(500).json({ ok: false, error: err?.message });
//   }
// });

// /**
//  * -----------------------------------------
//  *  🔥 NEW — RELEASE NOTES GENERATION ENDPOINT
//  * -----------------------------------------
//  */
// app.post("/generate-release-notes", async (req, res) => {
//   try {
//     const { commits, version, userPrompt } = req.body || {};

//     if (!commits || commits.length === 0) {
//       return res
//         .status(400)
//         .json({ ok: false, error: "No commits provided" });
//     }

//     console.log("🚀 Generating release notes using Mistral…");

//     const text = await mistralGenerate({
//       commits,
//       version,
//       prompt: userPrompt
//     });

//     return res.json({
//       ok: true,
//       release_notes: text
//     });
//   } catch (err) {
//     console.error("Mistral error:", err);
//     res.status(500).json({ ok: false, error: err?.message });
//   }
// });

// const PORT = process.env.PORT || 8788;
// app.listen(PORT, () =>
//   console.log(`🔥 Backend running at http://localhost:${PORT}`)
// );
