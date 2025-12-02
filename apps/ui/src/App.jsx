// import { useState } from "react";
// import PromptForm from "./components/PromptForm";
// import ResultCard from "./components/ResultCard";
// import PromptLibrary from "./components/PromptLibrary";

// export default function App() {
//   const [prompt, setPrompt] = useState("");
//   const [result, setResult] = useState(null);
//   const [context, setContext] = useState(null);
//   const [busy, setBusy] = useState(false);

//   const handleSubmit = async ({ prompt, repoPath, refresh }) => {
//     setBusy(true); setResult(null); setContext(null);
//     try {
//       const res = await fetch("http://localhost:8788/categorize", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ prompt, repoPath, refresh })
//       });
//       const data = await res.json();
//       // if (!data.ok) throw new Error(data.error || "Request failed");
//       if (!data.ok) { setResult({ error: data.message || data.error || "Request failed", doc_type: data.doc_type, extracted: data.extracted }); return; }
//       setResult(data.tool.observation);
//       setContext(data.prompt_context);
//     } catch (e) {
//       setResult({ error: e?.message || String(e) });
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <div style={{ maxWidth: 1000, margin: "40px auto", fontFamily: "Inter, ui-sans-serif, system-ui" }}>
//       <h1 style={{ fontSize: 28, fontWeight: 800 }}>Release Notes Generator</h1>

//       <PromptForm
//         initialRepo="/Users/personal/fastapi"
//         prompt={prompt}
//         onChangePrompt={setPrompt}
//         onSubmit={handleSubmit}
//       />

//       <PromptLibrary onUse={setPrompt} />

//       {busy && <div style={{ marginTop: 12, opacity: 0.8 }}>Building context & classifying…</div>}
//       <ResultCard result={result} context={context} />
//     </div>
//   );
// }





import { useState } from "react";
import PromptForm from "./components/PromptForm";
import PromptLibrary from "./components/PromptLibrary";
import ResultCard from "./components/ResultCard";
import ReleaseNotesGenerator from "./components/ReleaseNotesGenerator";
import "./App.css";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [context, setContext] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async ({ prompt, repoPath, refresh }) => {
    setBusy(true);
    setResult(null);
    setContext(null);

    try {
      const res = await fetch("http://localhost:8788/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, repoPath, refresh }),
      });

      const data = await res.json();

      if (!data.ok) {
        setResult({
          error: data.message || data.error || "Request failed",
          doc_type: data.doc_type,
          extracted: data.extracted,
        });
        return;
      }

      setResult(data.tool.observation);
      setContext(data.prompt_context);
    } catch (err) {
      setResult({ error: err.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", fontFamily: "Inter" }}>
      {/* NEW: Mistral Release Notes Generator */}
      <ReleaseNotesGenerator />

      <hr style={{ margin: "40px 0", opacity: 0.3 }} />

      {/* Original RN/PKT/FKT Classifier UI */}
      <PromptForm
        initialRepo="/Users/srikanth/desktop/mastodon"
        prompt={prompt}
        onChangePrompt={setPrompt}
        onSubmit={handleSubmit}
      />

      <PromptLibrary onUse={setPrompt} />

      {busy && (
        <div style={{ marginTop: 12, opacity: 0.8 }}>
          Building context & classifying…
        </div>
      )}

      <ResultCard result={result} context={context} />
    </div>
  );
}
