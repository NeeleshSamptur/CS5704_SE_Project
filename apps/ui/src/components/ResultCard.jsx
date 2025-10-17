export default function ResultCard({ result, context }) {
    if (!result && !context) return null;
  
    return (
      <section style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {result && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Categorizer Result</h2>
            <div style={{ marginTop: 10, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
              {result.error ? (
                <div style={{ color: "crimson" }}>Error: {result.error}</div>
              ) : (
                <>
                  <div><b>Doc Type:</b> {result.doc_type}</div>
                  <div><b>Confidence:</b> {Number(result.confidence).toFixed(2)}</div>
                  <div><b>Extracted:</b> <code>{JSON.stringify(result.extracted)}</code></div>
                  <details style={{ marginTop: 8 }}>
                    <summary>Rationale</summary>
                    <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{result.rationale}</pre>
                  </details>
                </>
              )}
            </div>
          </div>
        )}
  
        {context && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Prompt Context (RN / PKT / FKT)</h2>
            <div style={{ marginTop: 10, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                Updated: {context?.meta?.updatedAt} | Repo: {context?.meta?.repoPath}
              </div>
              <details open>
                <summary><b>RN</b> releases</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(context?.RN, null, 2)}</pre>
              </details>
              <details>
                <summary><b>PKT</b> authors</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(context?.PKT, null, 2)}</pre>
              </details>
              <details>
                <summary><b>FKT</b> features</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(context?.FKT, null, 2)}</pre>
              </details>
            </div>
          </div>
        )}
      </section>
    );
  }
  