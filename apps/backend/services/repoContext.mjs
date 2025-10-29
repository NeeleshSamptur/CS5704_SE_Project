import fs from "fs/promises";
import simpleGit from "simple-git";

/**
 * Build *fresh* prompt context JSON for RN / PKT / FKT.
 * If refreshRemote = true, runs `git fetch --all --tags` before reading.
 */
export async function buildPromptContext(repoPath, { refreshRemote = false } = {}) {
  const git = simpleGit({ baseDir: repoPath });

  if (refreshRemote) {
    try {
      await git.fetch(["--all", "--tags"]);
    } catch (e) {
      console.warn("fetch failed, using local data:", e?.message || e);
    }
  }

  const [releases, authors] = await Promise.all([
    getReleases(git),
    getAuthors(git),
  ]);

  console.log("authrddds",authors)
  console.log("ddd",releases)

  const updatedAt = new Date().toISOString();
  return {
    RN: { releases },        // [{tag, date?}] newest first when possible
    PKT: { authors },        // [{name, email}]
    meta: { updatedAt, repoPath }
  };
}




// --- helpers ---
async function getReleases(git) {
  try {
    const raw = await git.raw([
      "for-each-ref",
      "--sort=-creatordate",
      "--format=%(refname:short)|%(creatordate:iso8601)",
      "refs/tags"
    ]);
    return raw
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [tag, date] = line.split("|");
        return { tag, date };
      });
  } catch {
    const t = await git.tags();
    const all = (t.all || []).reverse();
    return all.map(tag => ({ tag, date: null }));
  }
}

async function getAuthors(git) {
  const raw = await git.raw(["shortlog", "-se", "HEAD"]);
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const authors = lines.map(l => ({ name: l.replace(/^\d+\s+/, ""), email: "" }));

  await Promise.all(
    authors.map(async (a) => {
      try {
        const out = await git.raw(["log", "-1", `--author=${a.name}`, "--format=%ae"]);
        a.email = (out.split("\n")[0] || "").trim();
      } catch {}
    })
  );

  return authors;
}
