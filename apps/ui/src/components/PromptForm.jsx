import { useState } from "react";

export default function PromptForm({ initialRepo = "", prompt, onChangePrompt, onSubmit }) {
  const [repoPath, setRepoPath] = useState(initialRepo);
  const [refresh, setRefresh] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ prompt: (prompt || "").trim(), repoPath: repoPath.trim(), refresh });
  };

  return (
    <form onSubmit={submit}
      style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
      <label>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Local Repo Path</div>
        <input
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          placeholder="/Users/srikanth/fastapi"
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d0d0" }}
          required
        />
      </label>
      <label>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Your prompt</div>
        <textarea
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          rows={4}
          placeholder="Generate release notes from V.10.0.0 to V.23.5"
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d0d0" }}
          required
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} />
        <span>Run <code>git fetch --all --tags</code> before building context</span>
      </label>
      <button type="submit"
        style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 700 }}>
        Generate context
      </button>
    </form>
  );
}
