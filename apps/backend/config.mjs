import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract repository path from App.jsx
 */
async function getRepoPathFromAppJsx() {
  try {
    const appJsxPath = path.join(__dirname, "../ui/src/App.jsx");
    const content = await fs.readFile(appJsxPath, "utf-8");
    
    // Match: initialRepo="/path/to/repo"
    const match = content.match(/initialRepo=["']([^"']+)["']/);
    
    if (match && match[1]) {
      return match[1];
    }
    
    console.warn("⚠️  Could not find initialRepo in App.jsx, using fallback");
    return "/Users/Rishab_Kshatri/Work2/personal/fastapi";
  } catch (error) {
    console.warn("⚠️  Could not read App.jsx:", error.message);
    return "/Users/Rishab_Kshatri/Work2/personal/fastapi";
  }
}

// Get repo path synchronously for config
const defaultRepoPath = await getRepoPathFromAppJsx();

/**
 * Configuration for RepoSense backend
 * Repository path is automatically extracted from App.jsx
 */
export const config = {
  // Default repository path (extracted from App.jsx)
  defaultRepoPath,
  
  // Output directory for generated files
  outputDir: "output",
  
  // Author extraction settings
  authorExtraction: {
    maxAuthors: 800,
    defaultFormat: "json" // json, csv, or top
  },
  
  // Release notes settings
  releaseNotes: {
    maxReleases: 220
  },
  
  // Feature search settings
  featureSearch: {
    maxFiles: 50,
    minKeywordMatches: 2
  }
};

export default config;

