import mongoose from 'mongoose';

const contributorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contribution: { type: Number, default: 0, min: 0, max: 100 },
  contributedAt: { type: Date, default: Date.now }
}, { _id: false });

const versionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  title: { type: String, trim: true, maxlength: 150 },
  text: { type: String, required: true, trim: true },
  characterCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  uniqueReaders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  gemsEarned: { type: Number, default: 0 },          // base value
  chainValue: { type: Number, default: 0 },          // total value including later influence
  miningReward: { type: Number, default: 0 },        // mining reward for this version
  appreciation: { type: Number, default: 0 },        // how much later blocks added
  rawGems: { type: Number, default: 0 },
  noveltyMultiplier: { type: Number, default: 1.0 },
  noveltyBonusType: { type: String, default: 'none' },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
  contributors: [contributorSchema],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedAt: { type: Date, default: Date.now },
  reason: { type: String, trim: true, maxlength: 200 }
}, { _id: false });

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 150 },
    text: { type: String, required: true, trim: true, maxlength: 10000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentContent: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', default: null, index: true },
    versions: [versionSchema],
    currentVersion: { type: Number, default: 1 },
    totalGems: { type: Number, default: 0 },         // total chain value of all versions
    totalViews: { type: Number, default: 0 },
    totalUniqueReaders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0, index: true },
    reports: [reportSchema],
    isReported: { type: Boolean, default: false, index: true },
    isPrivateToFollowers: { type: Boolean, default: false },
    characterCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes
contentSchema.index({ title: 'text', text: 'text' });
contentSchema.index({ parentContent: 1, createdAt: -1 });
contentSchema.index({ author: 1, createdAt: -1 });
contentSchema.index({ totalGems: -1 });

// Pre-save middleware
contentSchema.pre('save', function(next) {
  if (this.isModified('likes')) this.likeCount = this.likes.length;
  if (this.isModified('reports')) this.isReported = this.reports.length > 0;
  if (this.isModified('text')) {
    const plainText = this.text.replace(/<[^>]*>/g, '');
    this.characterCount = plainText.replace(/\s/g, '').length;
  }
  next();
});

// ---------- Helper: Recalculate chain values for all versions ----------
contentSchema.methods.recalculateAllChainValues = function() {
  const publishedVersions = this.versions.filter(v => v.published);
  const n = publishedVersions.length;
  
  // First pass: set base gemsEarned (already stored)
  // Second pass: compute chainValue = gemsEarned + sum of later contributions
  for (let i = 0; i < n; i++) {
    const current = publishedVersions[i];
    let chainVal = current.gemsEarned;
    for (let j = i + 1; j < n; j++) {
      const later = publishedVersions[j];
      const distance = j - i;
      const bonus = later.gemsEarned * (1 / Math.pow(2, distance));
      chainVal += bonus;
    }
    current.chainValue = Math.round(chainVal * 100) / 100;
    current.appreciation = Math.round((current.chainValue - current.gemsEarned) * 100) / 100;
    current.miningReward = this.calculateMiningRewardForVersion(current.versionNumber);
  }
  
  // Update totalGems = sum of all chainValues
  this.totalGems = publishedVersions.reduce((sum, v) => sum + v.chainValue, 0);
};

// ---------- Calculate mining reward for a specific version ----------
contentSchema.methods.calculateMiningRewardForVersion = function(versionNumber) {
  const version = this.versions.find(v => v.versionNumber === versionNumber);
  if (!version || !version.published) return 0;
  const blockReward = (version.gemsEarned || 0) * 0.1;
  let fees = 0;
  for (let i = 0; i < versionNumber - 1; i++) {
    const prevVersion = this.versions[i];
    if (prevVersion && prevVersion.published && prevVersion.gemsEarned) {
      fees += prevVersion.gemsEarned * 0.01;
    }
  }
  return Math.round((blockReward + fees) * 100) / 100;
};

// ---------- Calculate gems for a specific version (same formula as before) ----------
contentSchema.methods.calculateVersionGems = function(versionNumber) {
  const version = this.versions.find(v => v.versionNumber === versionNumber);
  if (!version) return 0;
  
  const uniqueReaders = version.uniqueReaders.length;
  const collaborators = version.contributors.length;
  const views = version.views || 0;
  const likes = version.likes.length || 0;
  const characters = version.characterCount || 0;
  
  let gems = (views * 0.1) + (likes * 3) + (uniqueReaders * 5) + (characters * 0.05);
  if (collaborators > 1) gems = gems * (1 / Math.sqrt(collaborators));
  
  let noveltyMultiplier = 1.0;
  if (versionNumber === 1) noveltyMultiplier = 2.0;
  else if (versionNumber === 2) noveltyMultiplier = 1.5;
  else if (versionNumber === 3) noveltyMultiplier = 1.2;
  
  const daysDiff = (new Date(version.createdAt) - new Date(this.createdAt)) / (1000 * 60 * 60 * 24);
  if (daysDiff < 1) noveltyMultiplier *= 1.5;
  else if (daysDiff < 7) noveltyMultiplier *= 1.3;
  else if (daysDiff < 30) noveltyMultiplier *= 1.1;
  
  version.noveltyMultiplier = noveltyMultiplier;
  version.noveltyBonusType = versionNumber === 1 ? 'version_first' : 
                              versionNumber === 2 ? 'version_second' :
                              versionNumber === 3 ? 'version_third' : 'none';
  
  gems = gems * noveltyMultiplier;
  return Math.round(gems * 100) / 100;
};

// ---------- Add a new version (unpublished) ----------
contentSchema.methods.addVersion = function(title, text, userId) {
  const newVersionNumber = this.versions.length + 1;
  const plainText = text.replace(/<[^>]*>/g, '');
  const characterCount = plainText.replace(/\s/g, '').length;
  
  let contributors = [];
  if (this.versions.length > 0) {
    const previousVersion = this.versions[this.versions.length - 1];
    contributors = [...previousVersion.contributors];
    const existing = contributors.find(c => c.user.toString() === userId.toString());
    if (existing) {
      existing.contribution += 10;
      existing.contributedAt = new Date();
    } else {
      contributors.push({ user: userId, contribution: 10, contributedAt: new Date() });
    }
    const total = contributors.reduce((sum, c) => sum + c.contribution, 0);
    contributors.forEach(c => { c.contribution = Math.round((c.contribution / total) * 100); });
  } else {
    contributors = [{ user: userId, contribution: 100, contributedAt: new Date() }];
  }
  
  const newVersion = {
    versionNumber: newVersionNumber,
    title: title || this.title,
    text,
    characterCount,
    contributors,
    likes: [],
    likeCount: 0,
    views: 0,
    uniqueReaders: [],
    createdAt: new Date(),
    published: false,
    gemsEarned: 0,
    chainValue: 0,
    miningReward: 0,
    appreciation: 0,
    rawGems: 0,
    noveltyMultiplier: 1.0,
    noveltyBonusType: 'none'
  };
  
  this.versions.push(newVersion);
  this.currentVersion = newVersionNumber;
  if (!this.collaborators.includes(userId)) this.collaborators.push(userId);
  return newVersion;
};

// ---------- Publish a version, calculate gems and chain values ----------
contentSchema.methods.publishVersion = function(versionNumber) {
  const version = this.versions.find(v => v.versionNumber === versionNumber);
  if (!version) return { error: 'Version not found' };
  if (version.published) return { error: 'Version already published' };
  
  // Calculate gems for this version
  const gemsEarned = this.calculateVersionGems(versionNumber);
  version.gemsEarned = gemsEarned;
  version.rawGems = gemsEarned;
  version.published = true;
  version.publishedAt = new Date();
  
  // Recalculate chain values for all published versions (including this one)
  this.recalculateAllChainValues();
  
  // Get the mining reward for this version (now calculated)
  const miningReward = version.miningReward;
  
  return {
    success: true,
    version,
    gemsEarned,
    totalGems: this.totalGems,
    chainValues: this.versions.reduce((acc, v) => {
      if (v.published) acc[v.versionNumber] = v.chainValue;
      return acc;
    }, {}),
    miningReward
  };
};

// ---------- Track a view for a specific version ----------
contentSchema.methods.trackView = function(versionNumber, userId) {
  const version = this.versions.find(v => v.versionNumber === versionNumber);
  if (!version) return;
  version.views += 1;
  this.totalViews += 1;
  if (userId && !version.uniqueReaders.includes(userId)) {
    version.uniqueReaders.push(userId);
  }
  if (userId && !this.totalUniqueReaders.includes(userId)) {
    this.totalUniqueReaders.push(userId);
  }
};

// ---------- Helper to get chain value for a version (from stored data) ----------
contentSchema.methods.getVersionChainValue = function(versionNumber) {
  const version = this.versions.find(v => v.versionNumber === versionNumber);
  return version ? version.chainValue : 0;
};

// ---------- Helper to get mining reward ----------
contentSchema.methods.getMiningReward = function(versionNumber) {
  const version = this.versions.find(v => v.versionNumber === versionNumber);
  return version ? version.miningReward : 0;
};

// ---------- Helper to get appreciation ----------
contentSchema.methods.getVersionAppreciation = function(versionNumber) {
  const version = this.versions.find(v => v.versionNumber === versionNumber);
  return version ? version.appreciation : 0;
};

// ---------- Get all versions with their chain data ----------
contentSchema.methods.getAllVersionsData = function() {
  return this.versions.map(v => ({
    ...v.toObject(),
    chainValue: v.chainValue,
    miningReward: v.miningReward,
    appreciation: v.appreciation
  }));
};

// Virtuals
contentSchema.virtual('id').get(function() { return this._id.toHexString(); });

// JSON transform (include computed fields from stored data)
contentSchema.set('toJSON', { 
  virtuals: true, 
  versionKey: false, 
  transform: function(doc, ret) { 
    delete ret._id;
    delete ret.__v;
    if (ret.versions && ret.versions.length > 0) {
      ret.versions = ret.versions.map(v => ({
        ...v,
        chainValue: v.chainValue,
        miningReward: v.miningReward,
        appreciation: v.appreciation
      }));
    }
  }
});

const Content = mongoose.model('Content', contentSchema);
export default Content;