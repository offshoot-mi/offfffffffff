// /server/services/content.service.js
import { getContents, saveContents, generateId } from '../data/database.js';
import { findUserById } from './user.service.js';

function toJSON(content) {
  if (!content) return null;
  const { _id, ...rest } = content;
  return { id: _id?.toString() || content.id, ...rest };
}

export async function findAllContents(filter = {}, sort = {}, skip = 0, limit = 10) {
  let contents = await getContents();
  
  if (filter.parentContent !== undefined) {
    if (filter.parentContent === null) contents = contents.filter(c => !c.parentContent);
    else contents = contents.filter(c => c.parentContent === filter.parentContent);
  }
  if (filter.author) {
    if (Array.isArray(filter.author.$in)) {
      contents = contents.filter(c => filter.author.$in.includes(c.author));
    } else {
      contents = contents.filter(c => c.author === filter.author);
    }
  }
  if (filter.isPrivateToFollowers !== undefined) {
    contents = contents.filter(c => c.isPrivateToFollowers === filter.isPrivateToFollowers);
  }
  
  if (sort.createdAt === -1) contents.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort.createdAt === 1) contents.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (sort.likeCount === -1) contents.sort((a,b) => (b.likeCount||0) - (a.likeCount||0));
  
  const total = contents.length;
  const paginated = contents.slice(skip, skip + limit);
  return { contents: paginated.map(toJSON), total };
}

export async function findContentById(id) {
  const contents = await getContents();
  const content = contents.find(c => c._id === id || c.id === id);
  return toJSON(content);
}

export async function findContentByParent(parentId) {
  const contents = await getContents();
  return contents.filter(c => c.parentContent === parentId).map(toJSON);
}

export async function createContent(contentData) {
  const contents = await getContents();
  const newId = generateId(contents);
  const now = new Date().toISOString();
  const newContent = {
    _id: newId,
    id: newId,
    ...contentData,
    createdAt: now,
    updatedAt: now,
    versions: [],
    currentVersion: 1,
    totalGems: 0,
    totalViews: 0,
    totalUniqueReaders: [],
    collaborators: [],
    likes: [],
    likeCount: 0,
    reports: [],
    isReported: false,
    characterCount: 0,
  };
  contents.push(newContent);
  await saveContents(contents);
  return toJSON(newContent);
}

export async function updateContentById(id, updates) {
  const contents = await getContents();
  const index = contents.findIndex(c => c._id === id || c.id === id);
  if (index === -1) return null;
  
  const updated = { 
    ...contents[index], 
    ...updates, 
    updatedAt: new Date().toISOString(),
    _id: contents[index]._id
  };
  
  contents[index] = updated;
  await saveContents(contents);
  return toJSON(updated);
}

export async function deleteContentById(id) {
  let contents = await getContents();
  contents = contents.filter(c => c._id !== id && c.id !== id);
  await saveContents(contents);
  return true;
}

// ========== Gem & Version Calculation Functions ==========

export function calculateVersionGems(content, versionNumber) {
  const version = content.versions.find(v => v.versionNumber === versionNumber);
  if (!version) return 0;
  const uniqueReaders = version.uniqueReaders?.length || 0;
  const collaborators = version.contributors?.length || 1;
  const views = version.views || 0;
  const likes = version.likes?.length || 0;
  const characters = version.characterCount || 0;
  
  let gems = (views * 0.1) + (likes * 3) + (uniqueReaders * 5) + (characters * 0.05);
  if (collaborators > 1) gems = gems * (1 / Math.sqrt(collaborators));
  
  let noveltyMultiplier = 1.0;
  if (versionNumber === 1) noveltyMultiplier = 2.0;
  else if (versionNumber === 2) noveltyMultiplier = 1.5;
  else if (versionNumber === 3) noveltyMultiplier = 1.2;
  
  const daysDiff = (new Date(version.createdAt) - new Date(content.createdAt)) / (1000 * 60 * 60 * 24);
  if (daysDiff < 1) noveltyMultiplier *= 1.5;
  else if (daysDiff < 7) noveltyMultiplier *= 1.3;
  else if (daysDiff < 30) noveltyMultiplier *= 1.1;
  
  gems = gems * noveltyMultiplier;
  return Math.round(gems * 100) / 100;
}

export function recalculateAllChainValues(content) {
  const publishedVersions = content.versions.filter(v => v.published);
  const n = publishedVersions.length;
  
  for (let i = 0; i < n; i++) {
    const current = publishedVersions[i];
    let chainVal = current.gemsEarned || 0;
    let fees = 0;
    
    // Add contributions from later versions
    for (let j = i + 1; j < n; j++) {
      const later = publishedVersions[j];
      const distance = j - i;
      const bonus = (later.gemsEarned || 0) * (1 / Math.pow(2, distance));
      chainVal += bonus;
    }
    
    // Calculate fees from previous versions
    for (let j = 0; j < current.versionNumber - 1; j++) {
      const prevVersion = content.versions[j];
      if (prevVersion && prevVersion.published && prevVersion.gemsEarned) {
        fees += prevVersion.gemsEarned * 0.01;
      }
    }
    
    const blockReward = (current.gemsEarned || 0) * 0.1;
    const chainValue = Math.round(chainVal * 100) / 100;
    const appreciation = Math.round((chainValue - (current.gemsEarned || 0)) * 100) / 100;
    const miningReward = Math.round((blockReward + fees) * 100) / 100;
    
    current.chainValue = chainValue;
    current.appreciation = appreciation;
    current.miningReward = miningReward;
  }
  
  content.totalGems = publishedVersions.reduce((sum, v) => sum + (v.chainValue || 0), 0);
  return content;
}

export function addVersion(content, title, text, userId) {
  const newVersionNumber = content.versions.length + 1;
  const plainText = text.replace(/<[^>]*>/g, '');
  const characterCount = plainText.replace(/\s/g, '').length;
  
  let contributors = [];
  if (content.versions.length > 0) {
    const previousVersion = content.versions[content.versions.length - 1];
    contributors = [...(previousVersion.contributors || [])];
    const existing = contributors.find(c => c.user === userId);
    if (existing) {
      existing.contribution += 10;
      existing.contributedAt = new Date().toISOString();
    } else {
      contributors.push({ user: userId, contribution: 10, contributedAt: new Date().toISOString() });
    }
    const total = contributors.reduce((sum, c) => sum + c.contribution, 0);
    contributors.forEach(c => { c.contribution = Math.round((c.contribution / total) * 100); });
  } else {
    contributors = [{ user: userId, contribution: 100, contributedAt: new Date().toISOString() }];
  }
  
  const newVersion = {
    versionNumber: newVersionNumber,
    title: title || content.title,
    text,
    characterCount,
    contributors,
    likes: [],
    likeCount: 0,
    views: 0,
    uniqueReaders: [],
    createdAt: new Date().toISOString(),
    published: false,
    gemsEarned: 0,
    chainValue: 0,
    miningReward: 0,
    appreciation: 0,
    rawGems: 0,
    noveltyMultiplier: 1.0,
    noveltyBonusType: 'none'
  };
  
  content.versions.push(newVersion);
  content.currentVersion = newVersionNumber;
  if (!content.collaborators.includes(userId)) content.collaborators.push(userId);
  return newVersion;
}

export function publishVersion(content, versionNumber) {
  const version = content.versions.find(v => v.versionNumber === versionNumber);
  if (!version) return { error: 'Version not found' };
  if (version.published) return { error: 'Version already published' };
  
  // Calculate gems for this version
  const gemsEarned = calculateVersionGems(content, versionNumber);
  version.gemsEarned = gemsEarned;
  version.rawGems = gemsEarned;
  version.published = true;
  version.publishedAt = new Date().toISOString();
  
  // Recalculate ALL chain values (this updates chainValue, miningReward, appreciation for ALL versions)
  recalculateAllChainValues(content);
  
  return {
    success: true,
    version,
    gemsEarned,
    totalGems: content.totalGems,
    chainValue: version.chainValue,
    miningReward: version.miningReward,
    appreciation: version.appreciation
  };
}

export function trackView(content, versionNumber, userId) {
  const version = content.versions.find(v => v.versionNumber === versionNumber);
  if (!version) return;
  version.views = (version.views || 0) + 1;
  content.totalViews = (content.totalViews || 0) + 1;
  if (userId && !version.uniqueReaders?.includes(userId)) {
    version.uniqueReaders = version.uniqueReaders || [];
    version.uniqueReaders.push(userId);
  }
  if (userId && !content.totalUniqueReaders?.includes(userId)) {
    content.totalUniqueReaders = content.totalUniqueReaders || [];
    content.totalUniqueReaders.push(userId);
  }
}

export async function populateContent(content) {
  if (!content) return null;
  const populated = { ...content };
  
  if (content.author) {
    populated.author = await findUserById(content.author);
  }
  
  if (content.likes && content.likes.length) {
    populated.likes = await Promise.all(content.likes.map(id => findUserById(id)));
    populated.likes = populated.likes.filter(Boolean);
  }
  
  if (content.reports && content.reports.length) {
    populated.reports = await Promise.all(content.reports.map(async (report) => ({
      ...report,
      reporter: await findUserById(report.reporter)
    })));
  }
  
  if (content.collaborators && content.collaborators.length) {
    populated.collaborators = await Promise.all(content.collaborators.map(id => findUserById(id)));
    populated.collaborators = populated.collaborators.filter(Boolean);
  }
  
  if (content.versions && content.versions.length) {
    populated.versions = await Promise.all(content.versions.map(async (v) => ({
      ...v,
      contributors: v.contributors ? await Promise.all(v.contributors.map(async (c) => ({
        ...c,
        user: await findUserById(c.user)
      }))) : []
    })));
  }
  
  // Add computed chain value fields for easy access
  const currentVersion = populated.versions?.find(v => v.versionNumber === populated.currentVersion);
  if (currentVersion) {
    populated.currentChainValue = currentVersion.chainValue || currentVersion.gemsEarned || 0;
    populated.currentMiningReward = currentVersion.miningReward || 0;
    populated.currentAppreciation = currentVersion.appreciation || 0;
  }
  
  return populated;
}