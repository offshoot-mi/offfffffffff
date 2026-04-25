import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = __dirname;
const usersPath = path.join(dataDir, 'users.json');
const contentsPath = path.join(dataDir, 'contents.json');

const ensureFile = (filePath, defaultContent) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
    console.log(`Created ${path.basename(filePath)}`);
  }
};

ensureFile(usersPath, []);
ensureFile(contentsPath, []);

export { usersPath, contentsPath };