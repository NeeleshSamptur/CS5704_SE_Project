import React, { useState } from "react";

function ReleaseNotesGenerator() {
  const [tag, setTag] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generateNotes = async () => {
    if (!tag.trim()) {
      alert("Enter a version/tag like v0.8 or v1.0");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("http://localhost:8788/generate-release-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate release notes for ${tag}`,
          repoPath: "/Users/srikanth/Desktop/mastodon",
          refresh: false
        }),
      });

      const data = await res.json();

      if (data?.output) {
        setResult(data.output);
      } else {
        setResult("⚠ No output from backend");
      }
    } catch (err) {
      console.error(err);
      setResult("❌ Error contacting backend");
    }

    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", marginBottom: "40px" }}>
      <h2>Generate Release Notes</h2>

      <input
        type="text"
        placeholder="v0.8"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        style={{
          padding: "10px",
          width: "250px",
          background: "#1e1e1e",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "6px",
          marginBottom: "20px",
        }}
      />

      <br />

      <button
        onClick={generateNotes}
        disabled={loading}
        style={{
          padding: "12px 18px",
          background: "#3b82f6",
          borderRadius: "6px",
          border: "none",
          color: "white",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        {loading ? "Generating…" : "Generate Release Notes with Mistral"}
      </button>

      {result && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            background: "#111",
            color: "#ddd",
            borderRadius: "8px",
            border: "1px solid #333",
            whiteSpace: "pre-wrap",
            textAlign: "left",
            width: "80%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}

export default ReleaseNotesGenerator;
