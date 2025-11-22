import simpleGit from "simple-git";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'neeleshsamptur',
  host: 'localhost',        // or '/tmp' if you want socket path
  database: 'commit_tracker',
  port: 5432
});


/**
 * Fetch commit metadata plus diff and associated tags for a repository.
 *
 * @param {string} repoPath - Absolute path to the Git repository.
 * @param {object} [options]
 * @param {number} [options.limit=20] - Max number of commits to return.
 * @param {string} [options.from] - Git ref/hash to start from (inclusive).
 * @param {string} [options.to] - Git ref/hash to end at (inclusive).
 * @returns {Promise<Array<{
 *   commitId: string,
 *   message: string,
 *   author: { name: string, email: string },
 *   committedAt: string,
 *   releaseTags: string[],
 *   diff: string
 * }>>}
 */
export async function fetchCommitDetails(repoPath, { from, to } = {}) {
  if (!repoPath) {
    throw new Error("fetchCommitDetails requires a repoPath");
  }

  const git = simpleGit({ baseDir: repoPath });
  const logOptions = {};
 
  if (from && to) {
    logOptions.from = from;
    logOptions.to = to;
  } else if (from) {
    logOptions.from = from;
  } else if (to) {
    logOptions.to = to;
  }

  const log = await git.log(logOptions);
  const commits = log.all || [];

  for (const commit of commits) {
    const { hash, message, author_name, author_email, date } = commit;

    if (isBotAuthor(author_name, author_email)) {
      continue;
    }

    // Associated tags (e.g., release tags)
    const tagsRaw = await git.raw(["tag", "--points-at", hash]);
    const releaseTags = tagsRaw
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    if (releaseTags.length === 0) {
      try {
        const nearestTag = await git.raw(["describe", "--tags", "--abbrev=0", hash]);
        const tag = nearestTag.trim();
        if (tag) {
          releaseTags.push(tag);
        }
      } catch {
        // no reachable tag; leave list empty
      }
    }


    // Patch between this commit and its parent(s)
    const diff = await git.diff([`${hash}^!`]);

    // details.push({
    //   commit_id: hash,
    //   message:message,
    //   author_name: author_name,
    //   author_email: author_email ,
    //   committedAt: date,
    //   release_tag:releaseTags,
    //   code_diff: diff
    // });

  //   try {
  //     await pool.query(
  //       `INSERT INTO public.commits
  //        (commit_id, message, author_name, author_email, committed_at, release_tag, code_diff)
  //        VALUES ($1,$2,$3,$4,$5,$6,$7)
  //        ON CONFLICT (commit_id) DO NOTHING`,
  //       [hash, message, author_name, author_email, date, releaseTags[0], diff]
  //     );
  //   } catch (err) {
  //     console.error(`Failed to insert commit ${hash}:`, err);
  //   }
  
  // }

  // return details;
}

function isBotAuthor(name = "", email = "") {
  const normalizedName = name.toLowerCase();
  const normalizedEmail = (email || "").toLowerCase();
  return (
    normalizedName.includes("[bot]") ||
    normalizedName.endsWith(" bot") ||
    normalizedEmail.includes("bot@") ||
    normalizedEmail.includes("noreply.github.com") ||
    normalizedEmail.endsWith("@users.noreply.github.com")
  );
}
