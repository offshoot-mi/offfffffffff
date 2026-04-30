import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to your JSON files
const dataDir = __dirname;
const usersPath = path.join(dataDir, 'users.json');
const contentsPath = path.join(dataDir, 'contents.json');

// Ensure files exist (your original logic)
const ensureFile = (filePath, defaultContent) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
    console.log(`Created ${path.basename(filePath)}`);
  }
};
ensureFile(usersPath, []);
ensureFile(contentsPath, []);

// ----- NEW: Git sync helpers -----
async function syncToGit(commitMessage) {
  const git = simpleGit(__dirname);
  
  // Pull latest to avoid conflicts (optional, but safe)
  await git.pull('origin', 'main').catch(() => {});
  
  // Stage only the JSON files
  await git.add([usersPath, contentsPath]);
  
  const status = await git.status();
  if (status.files.length === 0) {
    console.log('No changes to commit');
    return;
  }
  
  await git.commit(commitMessage);
  
  // Push using GitHub token from environment variable
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable not set');
  const remoteUrl = `https://${token}@github.com/offshoot-mi/offfffffffff.git`;
  await git.push(remoteUrl, 'main');
  console.log('✅ Changes committed and pushed to GitHub');
}

// ----- NEW: Write functions that auto‑sync -----
export const writeUsers = async (data) => {
  fs.writeFileSync(usersPath, JSON.stringify(data, null, 2));
  await syncToGit('Update users.json');
};

export const writeContents = async (data) => {
  fs.writeFileSync(contentsPath, JSON.stringify(data, null, 2));
  await syncToGit('Update contents.json');
};

// ----- Existing exports (for backward compatibility) -----
export { usersPath, contentsPath };

// ----- Helper to read data (no sync needed) -----
export const readUsers = () => JSON.parse(fs.readFileSync(usersPath, 'utf8'));
export const readContents = () => JSON.parse(fs.readFileSync(contentsPath, 'utf8'));
