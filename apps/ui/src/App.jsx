import { useState } from "react";
import PromptForm from "./components/PromptForm";
import ResultCard from "./components/ResultCard";
import PromptLibrary from "./components/PromptLibrary";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [context, setContext] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async ({ prompt, repoPath, refresh }) => {
    setBusy(true); setResult(null); setContext(null);
    try {
      const res = await fetch("http://localhost:8788/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, repoPath, refresh })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Request failed");
      setResult(data.tool.observation);
      setContext(data.prompt_context);
    } catch (e) {
      setResult({ error: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>SE Docs — React UI + Prompt Library</h1>

      <PromptForm
        initialRepo="/Users/Rishab_Kshatri/Work2/personal/fastapi"
        prompt={prompt}
        onChangePrompt={setPrompt}
        onSubmit={handleSubmit}
      />

      <PromptLibrary onUse={setPrompt} />

      {busy && <div style={{ marginTop: 12, opacity: 0.8 }}>Building context & classifying…</div>}
      <ResultCard result={result} context={context} />
    </div>
  );
}
