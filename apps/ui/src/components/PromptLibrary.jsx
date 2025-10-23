export default function PromptLibrary({ onUse = () => {} }) {
  const samples = [
    { label: "RN: Release notes (between tags)", value: "Generate release notes from V.10.0.0 to V.23.5" },
    { label: "RN: What changed last minor", value: "What changed between v0.110.0 and v0.111.0" },
    { label: "PKT: KT for author", value: "Create a knowledge transfer document for @tiangolo" },
    { label: "PKT: Summarize contributions", value: "Summarize key contributions by Sebastian Ramirez" },
    { label: "Invalid prompt (test)", value: "Order pizza from the nearest store" }
  ];

  const containerStyle = {
    marginTop: 16,
    padding: 12,
    border: "1px dashed #bbb",
    borderRadius: 12,
    background: "#fff",             // ensure contrast against any dark page bg
    color: "#111",                   // force readable text color
  };

  const headingStyle = {
    fontWeight: 700,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: "1.2",
  };

  const listStyle = {
    display: "grid",
    gap: 8,
    maxHeight: 280,                 // prevents the page from stretching forever
    overflowY: "auto",              // adds scroll if needed
    paddingRight: 4,
  };

  const buttonStyle = {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#f7f7f7",
    cursor: "pointer",
    color: "#111",                   // <- critical: force visible text
    fontSize: 13,
    lineHeight: "1.3",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    outline: "none",
  };

  const buttonHoverStyle = { background: "#eee", borderColor: "#ccc" };
  const buttonFocusStyle = { boxShadow: "0 0 0 3px rgba(0, 120, 212, 0.3)" };

  return (
    <div style={containerStyle}>
      <div style={headingStyle}>Prompt Library</div>
      <div style={listStyle} role="list">
        {samples.map((s, i) => (
          <button
            key={i}
            onClick={() => onUse(s.value)}
            style={buttonStyle}
            title={s.value}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
            onFocus={(e) => Object.assign(e.currentTarget.style, { ...buttonStyle, ...buttonFocusStyle })}
            onBlur={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
