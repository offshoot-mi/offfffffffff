import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getUsers, saveUsers, generateId } from '../data/database.js';

// Helper to convert internal _id to id for API responses
function toJSON(user) {
  if (!user) return null;
  const { _id, ...rest } = user;
  return { id: _id?.toString() || user.id, ...rest };
}

// Find all users with optional filter
export async function findAllUsers(filter = {}) {
  let users = await getUsers();
  if (filter.status) users = users.filter(u => u.status === filter.status);
  if (filter._id) users = users.filter(u => u._id === filter._id);
  if (filter.email) users = users.filter(u => u.email === filter.email);
  if (filter.username) users = users.filter(u => u.username === filter.username);
  return users.map(toJSON);
}

export async function findUserById(id) {
  const users = await getUsers();
  const user = users.find(u => u._id === id || u.id === id);
  return toJSON(user);
}

export async function findOneUser(query) {
  const users = await getUsers();
  let user = null;
  if (query._id) user = users.find(u => u._id === query._id);
  else if (query.email) user = users.find(u => u.email === query.email);
  else if (query.username) user = users.find(u => u.username === query.username);
  else if (query.$or && Array.isArray(query.$or)) {
    user = users.find(u => 
      (query.$or[0].username && u.username === query.$or[0].username) ||
      (query.$or[1].email && u.email === query.$or[1].email)
    );
  }
  return toJSON(user);
}

export async function createUser(userData) {
  const users = await getUsers();
  const newId = generateId(users);
  const now = new Date().toISOString();
  const newUser = {
    _id: newId,
    id: newId,
    ...userData,
    createdAt: now,
    updatedAt: now,
    followers: [],
    following: [],
    pendingFollowRequests: [],
    publishedArticles: [],
    savedArticles: [],
    totalGems: 0,
    lifetimeGems: 0,
  };
  users.push(newUser);
  await saveUsers(users);
  return toJSON(newUser);
}

export async function updateUserById(id, updates) {
  const users = await getUsers();
  const index = users.findIndex(u => u._id === id || u.id === id);
  if (index === -1) return null;
  const updatedUser = { 
    ...users[index], 
    ...updates, 
    updatedAt: new Date().toISOString(),
    // Preserve original _id
    _id: users[index]._id
  };
  users[index] = updatedUser;
  await saveUsers(users);
  return toJSON(updatedUser);
}

export async function deleteUserById(id) {
  const users = await getUsers();
  const filtered = users.filter(u => u._id !== id && u.id !== id);
  await saveUsers(filtered);
  return true;
}

// Password matching
export async function matchPassword(user, enteredPassword) {
  if (user.status === 'deleted' || user.isGoogleAccount) return false;
  return await bcrypt.compare(enteredPassword, user.passwordHash);
}

// Email verification token
export function getEmailVerificationToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
}

// Password reset token
export function getPasswordResetToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return token;
}

// Add gems from publication
export function addGemsFromPublication(user, articleId, versionNumber, gemsEarned, title, collaborators = 1, noveltyInfo = {}) {
  const finalGems = collaborators > 1 ? gemsEarned * (1 / Math.sqrt(collaborators)) : gemsEarned;
  user.totalGems = (user.totalGems || 0) + finalGems;
  user.lifetimeGems = (user.lifetimeGems || 0) + gemsEarned;
  user.publishedArticles = user.publishedArticles || [];
  user.publishedArticles.push({
    articleId,
    versionNumber,
    gemsEarned: finalGems,
    rawGems: gemsEarned,
    collaborators,
    title,
    noveltyMultiplier: noveltyInfo.noveltyMultiplier || 1.0,
    noveltyBonusType: noveltyInfo.noveltyBonusType || 'none',
    isFirstVersion: noveltyInfo.isFirstVersion || false,
    publishedAt: new Date().toISOString()
  });
  return finalGems;
}

export function getDisplayGems(user) {
  return Math.round((user.totalGems || 0) * 100) / 100;
}

// Populate references (for user objects within content)
export async function populateUserRefs(userId) {
  return await findUserById(userId);
}