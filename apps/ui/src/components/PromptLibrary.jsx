export default function PromptLibrary({ onUse }) {
    const samples = [
      { label: "RN: Release notes (between tags)", value: "Generate release notes from V.10.0.0 to V.23.5" },
      { label: "RN: What changed last minor", value: "What changed between v0.110.0 and v0.111.0" },
      { label: "PKT: KT for author", value: "Create a knowledge transfer document by @tiangolo for the last quarter" },
      { label: "PKT: Summarize contributions", value: "Summarize key contributions by Sebastian Ramirez" },
      { label: "FKT: KT for module", value: "Create a feature-centric knowledge transfer for module fastapi" },
      { label: "FKT: Docs for component", value: "Generate a KT overview for component routing" },
      { label: "Invalid prompt (test)", value: "Order pizza from the nearest store" }
    ];
  
    return (
      <div style={{ marginTop: 16, padding: 12, border: "1px dashed #bbb", borderRadius: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Prompt Library</div>
        <div style={{ display: "grid", gap: 8 }}>
          {samples.map((s, i) => (
            <button
              key={i}
              onClick={() => onUse(s.value)}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fafafa",
                cursor: "pointer"
              }}
              title={s.value}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  