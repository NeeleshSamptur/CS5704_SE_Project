import simpleGit from "simple-git";

export async function fetchCommitsBetweenTags(repoPath, fromTag, toTag) {
  const git = simpleGit(repoPath);

  const logs = await git.log({
    from: fromTag || undefined,
    to: toTag
  });

  return logs.all.map(c => ({
    hash: c.hash,
    date: c.date,
    message: c.message,
    author: c.author_name || c.author_email || "unknown",
    release_tag: toTag
  }));
}
