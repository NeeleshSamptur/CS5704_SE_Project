import simpleGit from "simple-git";
import pkg from 'pg';
const { Pool } = pkg;



const pool = new Pool({
  user: 'neeleshsamptur',
  password: 'password',   // add this
  host: '127.0.0.1',      // safest option
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
  const details = [];

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

    details.push({
      commit_id: hash,
      message:message,
      author_name: author_name,
      author_email: author_email ,
      committedAt: date,
      release_tag:releaseTags,
      code_diff: diff
    });
    //uncomment only when you want to insert data into table
   // try {
    //   await pool.query(
    //     `INSERT INTO public.commits
    //      (commit_id, message, author_name, author_email, committed_at, release_tag, code_diff)
    //      VALUES ($1,$2,$3,$4,$5,$6,$7)
    //      ON CONFLICT (commit_id) DO NOTHING`,
    //     [hash, message, author_name, author_email, date, releaseTags[0], diff]
    //   );
    // } catch (err) {
    //   console.error(`Failed to insert commit ${hash}:`, err);
    // }
  
  }

  return details;
}

export async function fetchAllCommits() {
  const result = await pool.query(
    `SELECT commit_id, message, author_name, author_email, committed_at, release_tag, code_diff
     FROM public.commits
     ORDER BY committed_at DESC`
  );
  return result.rows;
}

export async function fetchCommitsByAuthor(identifier) {
  if (!identifier) return [];
  const result = await pool.query(
    `SELECT commit_id, message, author_name, author_email, committed_at, release_tag, code_diff
     FROM public.commits
     WHERE LOWER(author_name) = LOWER($1) OR LOWER(author_email) = LOWER($1)
     ORDER BY committed_at DESC`,
    [identifier]
  );
  return result.rows;
}

export async function fetchCommitsByReleaseTags(tags = []) {
  const filtered = (tags || []).filter(Boolean);
  if (filtered.length === 0) return [];
  const result = await pool.query(
    `SELECT commit_id, message, author_name, author_email, committed_at, release_tag, code_diff
     FROM public.commits
     WHERE release_tag = ANY($1::text[])
     ORDER BY committed_at DESC`,
    [filtered]
  );
  return result.rows;
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
// import simpleGit from "simple-git";
// import pkg from 'pg';
// const { Pool } = pkg;

// const pool = new Pool({
//   user: 'neeleshsamptur',
//   password: 'password',
//   host: '127.0.0.1',
//   database: 'commit_tracker',
//   port: 5432
// });

// /**
//  * Build a complete map of commits to their release tags.
//  * Uses the CORRECT range-based method (tag1..tag2).
//  * This is what GitHub, GitLab, and all package managers use.
//  * 
//  * @param {simpleGit.SimpleGit} git - Simple-git instance
//  * @returns {Promise<Map<string, string>>} Map of commitHash => releaseTag
//  */
// async function buildCommitToTagMap(git) {
//   console.log("Building commit-to-tag map using range method...");
  
//   // Get all tags sorted by commit date (chronological order)
//   const tagsRaw = await git.raw(["tag", "--sort=creatordate"]);
//   const tags = tagsRaw.split("\n").map(t => t.trim()).filter(Boolean);
  
//   console.log(`Found ${tags.length} tags`);
  
//   const commitToTag = new Map();
  
//   for (let i = 0; i < tags.length; i++) {
//     const currentTag = tags[i];
//     const prevTag = i > 0 ? tags[i - 1] : null;
    
//     try {
//       // Get commits in this release using ranges
//       let commitsRaw;
      
//       if (prevTag) {
//         // Commits between previous tag and current tag
//         commitsRaw = await git.raw(["rev-list", `${prevTag}..${currentTag}`]);
//       } else {
//         // First tag: all commits up to this tag
//         commitsRaw = await git.raw(["rev-list", currentTag]);
//       }
      
//       const commits = commitsRaw.split("\n").map(c => c.trim()).filter(Boolean);
      
//       console.log(`Tag ${currentTag}: ${commits.length} commits`);
      
//       // Assign each commit to this tag (first tag wins)
//       for (const hash of commits) {
//         if (!commitToTag.has(hash)) {
//           commitToTag.set(hash, currentTag);
//         }
//       }
//     } catch (err) {
//       console.error(`Error processing tag ${currentTag}:`, err.message);
//     }
//   }
  
//   console.log(`Mapped ${commitToTag.size} commits to tags`);
//   return commitToTag;
// }

// /**
//  * Fetch commit metadata plus diff and associated tags for a repository.
//  * Uses the CORRECT range-based tagging method.
//  * 
//  * @param {string} repoPath - Absolute path to the Git repository
//  * @param {object} options
//  * @param {string} [options.from] - Git ref/hash to start from
//  * @param {string} [options.to] - Git ref/hash to end at
//  * @returns {Promise<Array>} Array of commit details
//  */
// export async function fetchCommitDetails(repoPath, { from, to } = {}) {
//   if (!repoPath) {
//     throw new Error("fetchCommitDetails requires a repoPath");
//   }

//   const git = simpleGit({ baseDir: repoPath });
  
//   // Build the commit-to-tag map ONCE for the entire repo
//   const commitToTagMap = await buildCommitToTagMap(git);
  
//   const logOptions = {};
//   // const logOptions = {
//   //   '--since': '2025-01-01',
//   //   '--until': '2025-12-31 23:59:59'
//   // };
  
//   if (from && to) {
//     logOptions.from = from;
//     logOptions.to = to;
//   } else if (from) {
//     logOptions.from = from;
//   } else if (to) {
//     logOptions.to = to;
//   }

//   const log = await git.log(logOptions);
//   const commits = log.all || [];
//   const details = [];

//   console.log(`Processing ${commits.length} commits...`);

//   for (const commit of commits) {
//     const { hash, message, author_name, author_email, date } = commit;

//     if (isBotAuthor(author_name, author_email)) {
//       continue;
//     }

//     // ✅ CORRECT: Look up the release tag from our pre-built map
//     const releaseTag = commitToTagMap.get(hash) || null;

//     // Get the diff for this commit
//     let diff = "";
//     try {
//       diff = await git.diff([`${hash}^!`]);
//     } catch (err) {
//       // First commit might not have a parent
//       console.warn(`Could not get diff for ${hash}: ${err.message}`);
//     }

//     const commitData = {
//       commit_id: hash,
//       message: message,
//       author_name: author_name,
//       author_email: author_email,
//       committedAt: date,
//       release_tag: releaseTag,
//       code_diff: diff
//     };

//     details.push(commitData);

//     // Insert into database
//     try {
//       await pool.query(
//         `INSERT INTO public.commits
//          (commit_id, message, author_name, author_email, committed_at, release_tag, code_diff)
//          VALUES ($1, $2, $3, $4, $5, $6, $7)
//          ON CONFLICT (commit_id) 
//          DO UPDATE SET 
//            release_tag = EXCLUDED.release_tag,
//            message = EXCLUDED.message,
//            author_name = EXCLUDED.author_name,
//            author_email = EXCLUDED.author_email,
//            committed_at = EXCLUDED.committed_at,
//            code_diff = EXCLUDED.code_diff`,
//         [hash, message, author_name, author_email, date, releaseTag, diff]
//       );
//     } catch (err) {
//       console.error(`Failed to insert commit ${hash}:`, err);
//     }
//   }

//   console.log(`Processed ${details.length} commits (excluding bots)`);
//   return details;
// }

// /**
//  * Fetch all commits from the database
//  */
// export async function fetchAllCommits() {
//   const result = await pool.query(
//     `SELECT commit_id, message, author_name, author_email, committed_at, release_tag, code_diff
//      FROM public.commits
//      ORDER BY committed_at DESC`
//   );
//   return result.rows;
// }

// /**
//  * Fetch commits by author name or email
//  */
// export async function fetchCommitsByAuthor(identifier) {
//   if (!identifier) return [];
//   const result = await pool.query(
//     `SELECT commit_id, message, author_name, author_email, committed_at, release_tag, code_diff
//      FROM public.commits
//      WHERE LOWER(author_name) = LOWER($1) OR LOWER(author_email) = LOWER($1)
//      ORDER BY committed_at DESC`,
//     [identifier]
//   );
//   return result.rows;
// }

// /**
//  * Fetch commits by release tag(s)
//  */
// export async function fetchCommitsByReleaseTags(tags = []) {
//   const filtered = (tags || []).filter(Boolean);
//   if (filtered.length === 0) return [];

//   const result = await pool.query(
//     `SELECT commit_id, message, author_name, author_email, committed_at, release_tag, code_diff
//      FROM public.commits
//      WHERE release_tag = ANY($1::text[])
//      ORDER BY committed_at DESC`,
//     [filtered]
//   );
//   return result.rows;
// }

// /**
//  * Check if an author is a bot
//  */
// function isBotAuthor(name = "", email = "") {
//   const normalizedName = name.toLowerCase();
//   const normalizedEmail = (email || "").toLowerCase();
//   return (
//     normalizedName.includes("[bot]") ||
//     normalizedName.endsWith(" bot") ||
//     normalizedEmail.includes("bot@") ||
//     normalizedEmail.includes("noreply.github.com") ||
//     normalizedEmail.endsWith("@users.noreply.github.com")
//   );
// }

// /**
//  * Utility: Get all release tags for the repository
//  */
// export async function getAllReleaseTags(repoPath) {
//   const git = simpleGit({ baseDir: repoPath });
//   const tagsRaw = await git.raw(["tag", "--sort=creatordate"]);
//   return tagsRaw.split("\n").map(t => t.trim()).filter(Boolean);
// }

// /**
//  * Utility: Get commits for a specific release tag
//  */
// export async function getCommitsForTag(repoPath, tag) {
//   const git = simpleGit({ baseDir: repoPath });
  
//   // Get all tags to find the previous one
//   const tagsRaw = await git.raw(["tag", "--sort=creatordate"]);
//   const tags = tagsRaw.split("\n").map(t => t.trim()).filter(Boolean);
  
//   const tagIndex = tags.indexOf(tag);
//   if (tagIndex === -1) {
//     throw new Error(`Tag ${tag} not found`);
//   }
  
//   const prevTag = tagIndex > 0 ? tags[tagIndex - 1] : null;
//   const range = prevTag ? `${prevTag}..${tag}` : tag;
  
//   const commitsRaw = await git.raw(["rev-list", range, "--format=%H|%s|%an|%ae|%aI"]);
//   const lines = commitsRaw.split("\n").filter(l => !l.startsWith("commit ") && l.trim());
  
//   return lines.map(line => {
//     const [hash, message, author_name, author_email, date] = line.split("|");
//     return { hash, message, author_name, author_email, date };
//   });
// }

// // Export the pool for cleanup
// export { pool };