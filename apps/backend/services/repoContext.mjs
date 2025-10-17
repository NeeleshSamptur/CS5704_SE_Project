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

  const [releases, authors, features] = await Promise.all([
    getReleases(git, 800),
    getAuthors(git, 800),
    getFeatures(repoPath),
  ]);

  const updatedAt = new Date().toISOString();
  return {
    RN: { releases },        // [{tag, date?}] newest first when possible
    PKT: { authors },        // [{name, email}]
    FKT: { features },       // ["moduleA","moduleB",...]
    meta: { updatedAt, repoPath }
  };
}

// --- helpers ---
async function getReleases(git, limit = 800) {
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
      .slice(0, limit)
      .map(line => {
        const [tag, date] = line.split("|");
        return { tag, date };
      });
  } catch {
    const t = await git.tags();
    const all = (t.all || []).slice(-limit).reverse();
    return all.map(tag => ({ tag, date: null }));
  }
}

async function getAuthors(git, limit = 1000) {
  const raw = await git.raw(["shortlog", "-se", "HEAD"]);
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const authors = lines.map(l => ({ name: l.replace(/^\d+\s+/, ""), email: "" }));

  const cap = Math.min(limit, 250);
  await Promise.all(
    authors.slice(0, cap).map(async (a) => {
      try {
        const out = await git.raw(["log", "-1", `--author=${a.name}`, "--format=%ae"]);
        a.email = (out.split("\n")[0] || "").trim();
      } catch {}
    })
  );

  return authors.slice(0, limit);
}

async function getFeatures(repoPath) {
  const dirents = await fs.readdir(repoPath, { withFileTypes: true });
  return dirents
    .filter(d => d.isDirectory() && !d.name.startsWith(".") && d.name !== ".git")
    .map(d => d.name)
    .sort();
}
