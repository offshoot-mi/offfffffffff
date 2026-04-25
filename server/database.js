import fs from 'fs/promises';
import { usersPath, contentsPath } from './ensureDataFiles.js';

// Generic read/write
export async function readJSON(filePath) {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

export async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// User-specific helpers
export async function getUsers() {
  return readJSON(usersPath);
}

export async function saveUsers(users) {
  await writeJSON(usersPath, users);
}

// Content-specific helpers
export async function getContents() {
  return readJSON(contentsPath);
}

export async function saveContents(contents) {
  await writeJSON(contentsPath, contents);
}

// ID generation (simple counter based on max existing id)
export function generateId(collection) {
  const maxId = collection.reduce((max, item) => {
    const idNum = parseInt(item.id, 10);
    return idNum > max ? idNum : max;
  }, 0);
  return (maxId + 1).toString();
}