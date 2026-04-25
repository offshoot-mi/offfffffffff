import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const publishedArticleSchema = new mongoose.Schema({
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  versionNumber: { type: Number, required: true },
  gemsEarned: { type: Number, default: 0 },
  rawGems: { type: Number, default: 0 },
  collaborators: { type: Number, default: 1 },
  noveltyMultiplier: { type: Number, default: 1.0 },
  noveltyBonusType: { type: String, default: 'none' },
  isFirstVersion: { type: Boolean, default: false },
  publishedAt: { type: Date, default: Date.now },
  title: { type: String, trim: true }
}, { _id: true });

const savedArticleSchema = new mongoose.Schema({
  rootArticle: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  lineagePathIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
  customName: { type: String, trim: true, maxlength: 100 },
  savedAt: { type: Date, default: Date.now },
  gemsAtSave: { type: Number, default: 0 },
  blockCount: { type: Number, default: 0 }
}, { _id: true });

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    originalUsername: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    agreedToTerms: { type: Boolean, required: true, default: false },
    role: { type: String, enum: ['user', 'admin', 'deleted'], default: 'user' },
    profilePicture: { type: String, default: '' },
    bio: { type: String, maxlength: 160, default: '' },
    isPrivate: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingFollowRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isVerified: { type: Boolean, default: false },
    verificationRequestedAt: { type: Date },
    status: { type: String, enum: ['active', 'deleted'], default: 'active' },
    googleId: { type: String, unique: true, sparse: true },
    googleEmail: { type: String, lowercase: true, trim: true },
    isGoogleAccount: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    isEmailVerified: { type: Boolean, default: false },
    passwordResetToken: String,
    passwordResetExpires: Date,
    totalGems: { type: Number, default: 0, index: true },
    lifetimeGems: { type: Number, default: 0 },
    publishedArticles: [publishedArticleSchema],
    savedArticles: [savedArticleSchema],
  },
  { timestamps: true }
);

userSchema.index({ totalGems: -1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash') || this.isGoogleAccount) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) { next(error); }
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (this.status === 'deleted' || this.isGoogleAccount) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.methods.getEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

userSchema.methods.getPasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return token;
};

userSchema.methods.addGemsFromPublication = function(articleId, versionNumber, gemsEarned, title, collaborators = 1, noveltyInfo = {}) {
  const finalGems = collaborators > 1 ? gemsEarned * (1 / Math.sqrt(collaborators)) : gemsEarned;
  this.totalGems += finalGems;
  this.lifetimeGems += gemsEarned;
  this.publishedArticles.push({
    articleId, versionNumber, gemsEarned: finalGems, rawGems: gemsEarned,
    collaborators, title, noveltyMultiplier: noveltyInfo.noveltyMultiplier || 1.0,
    noveltyBonusType: noveltyInfo.noveltyBonusType || 'none',
    isFirstVersion: noveltyInfo.isFirstVersion || false, publishedAt: new Date()
  });
  return finalGems;
};

userSchema.methods.getDisplayGems = function() { return Math.round(this.totalGems * 100) / 100; };

userSchema.methods.getGemStats = function() {
  const totalPublished = this.publishedArticles.length;
  const avgGems = totalPublished > 0 ? this.totalGems / totalPublished : 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const last30DaysGems = this.publishedArticles
    .filter(a => a.publishedAt >= thirtyDaysAgo)
    .reduce((s, a) => s + a.gemsEarned, 0);
  
  return {
    totalGems: this.totalGems, lifetimeGems: this.lifetimeGems,
    displayGems: this.getDisplayGems(), totalPublished,
    averageGemsPerArticle: avgGems, last30DaysGems,
    firstPublication: this.publishedArticles[0]?.publishedAt || null,
    latestPublication: this.publishedArticles[this.publishedArticles.length - 1]?.publishedAt || null
  };
};

userSchema.virtual('id').get(function() { return this._id.toHexString(); });
userSchema.set('toJSON', {
  virtuals: true, versionKey: false,
  transform: function(doc, ret) {
    delete ret._id; delete ret.passwordHash; delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires; delete ret.passwordResetToken;
    delete ret.passwordResetExpires; delete ret.__v;
    ret.displayGems = doc.getDisplayGems ? doc.getDisplayGems() : ret.totalGems || 0;
  },
});

const User = mongoose.model('User', userSchema);
export default User;