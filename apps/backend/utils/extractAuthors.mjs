import fs from "fs/promises";
import path from "path";
import { buildPromptContext } from "../services/repoContext.mjs";

/**
 * Extract authors from a repository and save to a JSON file
 * @param {string} repoPath - Path to the git repository
 * @param {string} outputPath - Path where to save the authors file (optional)
 * @param {boolean} refreshRemote - Whether to fetch latest data from remote
 * @returns {Promise<object>} - Authors data and file path
 */
export async function extractAuthorsToFile(
  repoPath, 
  outputPath = null, 
  refreshRemote = false
) {
  console.log("🔍 Extracting authors from:", repoPath);
  
  // Build context to get authors
  const context = await buildPromptContext(repoPath, { refreshRemote });
  
  const authors = context.PKT.authors;
  const metadata = {
    totalAuthors: authors.length,
    extractedAt: context.meta.updatedAt,
    repoPath: context.meta.repoPath
  };
  
  console.log(`✅ Found ${authors.length} authors`);
  
  // Prepare output data
  const output = {
    metadata,
    authors: authors.map((author, index) => ({
      id: index + 1,
      ...author
    }))
  };
  
  // Determine output file path
  if (!outputPath) {
    const repoName = path.basename(repoPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    outputPath = path.join(
      process.cwd(), 
      `authors-${repoName}-${timestamp}.json`
    );
  }
  
  // Save to file
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`💾 Authors saved to: ${outputPath}`);
  
  return {
    filePath: outputPath,
    totalAuthors: authors.length,
    authors: output.authors
  };
}

/**
 * Extract authors and save to CSV format
 */
export async function extractAuthorsToCSV(
  repoPath, 
  outputPath = null, 
  refreshRemote = false
) {
  console.log("🔍 Extracting authors to CSV from:", repoPath);
  
  const context = await buildPromptContext(repoPath, { refreshRemote });
  const authors = context.PKT.authors;
  
  console.log(`✅ Found ${authors.length} authors`);
  
  // Determine output file path
  if (!outputPath) {
    const repoName = path.basename(repoPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    outputPath = path.join(
      process.cwd(), 
      `authors-${repoName}-${timestamp}.csv`
    );
  }
  
  // Build CSV content
  const csvLines = [
    "ID,Name,Email", // Header
    ...authors.map((author, index) => 
      `${index + 1},"${author.name}","${author.email}"`
    )
  ];
  
  const csvContent = csvLines.join("\n");
  
  // Save to file
  await fs.writeFile(outputPath, csvContent, "utf-8");
  console.log(`💾 Authors CSV saved to: ${outputPath}`);
  
  return {
    filePath: outputPath,
    totalAuthors: authors.length
  };
}

/**
 * Extract top N contributors with statistics
 */
export async function extractTopContributors(
  repoPath,
  topN = 10,
  outputPath = null,
  refreshRemote = false
) {
  console.log(`🔍 Extracting top ${topN} contributors from:`, repoPath);
  
  const context = await buildPromptContext(repoPath, { refreshRemote });
  const authors = context.PKT.authors.slice(0, topN);
  
  console.log(`✅ Found top ${authors.length} contributors`);
  
  // Determine output file path
  if (!outputPath) {
    const repoName = path.basename(repoPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    outputPath = path.join(
      process.cwd(), 
      `top-contributors-${repoName}-${timestamp}.json`
    );
  }
  
  const output = {
    metadata: {
      topN,
      extractedAt: context.meta.updatedAt,
      repoPath: context.meta.repoPath
    },
    topContributors: authors.map((author, index) => ({
      rank: index + 1,
      ...author
    }))
  };
  
  // Save to file
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`💾 Top contributors saved to: ${outputPath}`);
  
  return {
    filePath: outputPath,
    contributors: output.topContributors
  };
}

// CLI usage example
if (import.meta.url === `file://${process.argv[1]}`) {
  const repoPath = process.argv[2];
  const format = process.argv[3] || "json"; // json, csv, or top
  const outputPath = process.argv[4];
  
  if (!repoPath) {
    console.error("Usage: node extractAuthors.mjs <repo-path> [format] [output-path]");
    console.error("Format options: json (default), csv, top");
    console.error("\nExamples:");
    console.error("  node extractAuthors.mjs /path/to/repo");
    console.error("  node extractAuthors.mjs /path/to/repo csv");
    console.error("  node extractAuthors.mjs /path/to/repo top authors.json");
    process.exit(1);
  }
  
  try {
    let result;
    
    switch (format.toLowerCase()) {
      case "csv":
        result = await extractAuthorsToCSV(repoPath, outputPath);
        break;
      case "top":
        result = await extractTopContributors(repoPath, 10, outputPath);
        break;
      default:
        result = await extractAuthorsToFile(repoPath, outputPath);
    }
    
    console.log("\n✅ Extraction complete!");
    console.log("📄 File:", result.filePath);
    if (result.totalAuthors) {
      console.log("👥 Total authors:", result.totalAuthors);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

