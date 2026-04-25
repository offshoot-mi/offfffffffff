import asyncHandler from 'express-async-handler';
import { body, param, query, validationResult } from 'express-validator';
import { 
  findUserById, updateUserById, findAllUsers, createUser, deleteUserById,
  matchPassword, addGemsFromPublication, getDisplayGems
} from '../services/user.service.js';
import { findContentById, findAllContents, populateContent } from '../services/content.service.js';
import AppError from '../utils/AppError.js';
import bcrypt from 'bcryptjs';

const checkValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    next(new AppError(errorMessages, 400));
    return false;
  }
  return true;
};

// Get User Profile by Username
const getUserProfileByUsername = asyncHandler(async (req, res, next) => {
  const users = await findAllUsers({ username: req.params.username, status: 'active' });
  const targetUser = users[0];
  if (!targetUser) return next(new AppError('User not found', 404));
  
  let canViewProfile = false;
  const requestingUser = req.user;
  
  if (!targetUser.isPrivate) canViewProfile = true;
  else if (requestingUser) {
    if (requestingUser.id === targetUser.id || requestingUser.role === 'admin') canViewProfile = true;
    else if (targetUser.followers?.includes(requestingUser.id)) canViewProfile = true;
  }
  
  if (canViewProfile) {
    const profileData = { ...targetUser };
    profileData.followersCount = targetUser.followers?.length || 0;
    profileData.followingCount = targetUser.following?.length || 0;
    profileData.displayGems = getDisplayGems(targetUser);
    
    // Populate published articles
    const publishedArticlesWithDetails = await Promise.all((targetUser.publishedArticles || []).map(async (pa) => {
      const article = await findContentById(pa.articleId);
      return { ...pa, article };
    }));
    profileData.publishedArticles = publishedArticlesWithDetails;
    
    if (requestingUser) {
      profileData.isFollowedByMe = targetUser.followers?.includes(requestingUser.id) || false;
      profileData.hasPendingRequestFromMe = targetUser.pendingFollowRequests?.includes(requestingUser.id) || false;
    }
    
    if (!requestingUser || (requestingUser.id !== targetUser.id && requestingUser.role !== 'admin')) {
      delete profileData.followers;
      delete profileData.following;
      delete profileData.pendingFollowRequests;
    }
    
    res.json(profileData);
  } else {
    res.json({
      id: targetUser.id,
      username: targetUser.username,
      profilePicture: targetUser.profilePicture,
      bio: targetUser.bio,
      isPrivate: true,
      isVerified: targetUser.isVerified,
      totalGems: targetUser.totalGems,
      displayGems: getDisplayGems(targetUser),
      hasPendingRequestFromMe: targetUser.pendingFollowRequests?.includes(requestingUser?.id) || false,
      isFollowedByMe: targetUser.followers?.includes(requestingUser?.id) || false,
    });
  }
});

// Follow User
const followUser = asyncHandler(async (req, res, next) => {
  const userIdToFollow = req.params.userIdToFollow;
  const currentUserId = req.user.id;
  if (userIdToFollow === currentUserId) return next(new AppError("You cannot follow yourself", 400));
  
  const userToFollow = await findUserById(userIdToFollow);
  const currentUser = await findUserById(currentUserId);
  if (!userToFollow || !currentUser || userToFollow.status === 'deleted') {
    return next(new AppError("User not found", 404));
  }
  if (currentUser.following?.includes(userToFollow.id)) {
    return next(new AppError("You are already following this user", 400));
  }
  
  if (userToFollow.isPrivate) {
    if (userToFollow.pendingFollowRequests?.includes(currentUser.id)) {
      return next(new AppError("Follow request already sent", 400));
    }
    const updated = { ...userToFollow, pendingFollowRequests: [...(userToFollow.pendingFollowRequests || []), currentUser.id] };
    await updateUserById(userToFollow.id, updated);
    res.json({ message: "Follow request sent", pending: true });
  } else {
    await updateUserById(currentUser.id, { following: [...(currentUser.following || []), userToFollow.id] });
    await updateUserById(userToFollow.id, { followers: [...(userToFollow.followers || []), currentUser.id] });
    res.json({ message: `Successfully followed ${userToFollow.username}`, pending: false });
  }
});

// Unfollow User
const unfollowUser = asyncHandler(async (req, res, next) => {
  const userIdToUnfollow = req.params.userIdToUnfollow;
  const currentUserId = req.user.id;
  
  const userToUnfollow = await findUserById(userIdToUnfollow);
  const currentUser = await findUserById(currentUserId);
  if (!userToUnfollow || !currentUser) return next(new AppError("User not found", 404));
  
  await updateUserById(currentUser.id, { following: (currentUser.following || []).filter(id => id !== userToUnfollow.id) });
  await updateUserById(userToUnfollow.id, { 
    followers: (userToUnfollow.followers || []).filter(id => id !== currentUser.id),
    pendingFollowRequests: (userToUnfollow.pendingFollowRequests || []).filter(id => id !== currentUser.id)
  });
  res.json({ message: `Successfully unfollowed ${userToUnfollow.username}` });
});

// Get My Followers
const getMyFollowers = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));
  const followers = await Promise.all((user.followers || []).map(id => findUserById(id)));
  res.json(followers.filter(Boolean));
});

// Get My Following
const getMyFollowing = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));
  const following = await Promise.all((user.following || []).map(id => findUserById(id)));
  res.json(following.filter(Boolean));
});

// Get My Pending Follow Requests
const getMyPendingFollowRequests = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));
  const pending = await Promise.all((user.pendingFollowRequests || []).map(id => findUserById(id)));
  res.json(pending.filter(Boolean));
});

// Respond to Follow Request
const respondToFollowRequest = [
  param('requesterId').isString().notEmpty().trim(),
  body('action').isIn(['approve', 'deny']),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const requesterId = req.params.requesterId;
    const myId = req.user.id;
    const { action } = req.body;
    
    const me = await findUserById(myId);
    const requester = await findUserById(requesterId);
    if (!me || !requester) return next(new AppError("User not found", 404));
    if (!me.pendingFollowRequests?.includes(requesterId)) {
      return next(new AppError("No pending follow request", 404));
    }
    
    const updatedPending = me.pendingFollowRequests.filter(id => id !== requesterId);
    if (action === 'approve') {
      await updateUserById(me.id, { 
        pendingFollowRequests: updatedPending,
        followers: [...(me.followers || []), requesterId]
      });
      await updateUserById(requester.id, { following: [...(requester.following || []), myId] });
      res.json({ message: "Request approved." });
    } else {
      await updateUserById(me.id, { pendingFollowRequests: updatedPending });
      res.json({ message: "Request denied." });
    }
  })
];

// Remove Follower
const removeFollower = asyncHandler(async (req, res, next) => {
  const followerIdToRemove = req.params.followerIdToRemove;
  const currentUserId = req.user.id;
  
  const currentUser = await findUserById(currentUserId);
  const follower = await findUserById(followerIdToRemove);
  if (!currentUser || !follower) return next(new AppError("User not found", 404));
  
  await updateUserById(currentUser.id, { followers: (currentUser.followers || []).filter(id => id !== followerIdToRemove) });
  await updateUserById(follower.id, { following: (follower.following || []).filter(id => id !== currentUserId) });
  res.json({ message: `${follower.username} removed.` });
});

// Update User Profile
const updateUserProfile = [
  body('bio').optional().isString().isLength({ max: 160 }),
  body('profilePicture').optional({ checkFalsy: true }).isURL(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const user = await findUserById(req.user.id);
    if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
    
    const updates = {};
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.body.profilePicture !== undefined) updates.profilePicture = req.body.profilePicture;
    
    const updated = await updateUserById(user.id, updates);
    res.json(updated);
  })
];

// Toggle Account Privacy
const toggleAccountPrivacy = [
  body('isPrivate').isBoolean(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const userId = req.user.id;
    const { isPrivate: newPrivacyState } = req.body;
    
    const userBefore = await findUserById(userId);
    if (!userBefore) return next(new AppError("User not found", 404));
    
    const updates = { isPrivate: newPrivacyState };
    if (newPrivacyState === false && userBefore.pendingFollowRequests?.length) {
      updates.followers = [...(userBefore.followers || []), ...userBefore.pendingFollowRequests];
      updates.pendingFollowRequests = [];
      // Update each requester's following list
      for (const requesterId of userBefore.pendingFollowRequests) {
        const requester = await findUserById(requesterId);
        if (requester) {
          await updateUserById(requester.id, { following: [...(requester.following || []), userId] });
        }
      }
    }
    
    const updated = await updateUserById(userId, updates);
    res.json({ message: `Account privacy set to ${updated.isPrivate ? 'Private' : 'Public'}`, isPrivate: updated.isPrivate });
  })
];

// Change Username
const changeUsername = [
  body('newUsername').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const { newUsername } = req.body;
    const userId = req.user.id;
    
    if (newUsername.toLowerCase().includes('deleted account')) {
      return next(new AppError('Reserved username pattern.', 400));
    }
    const existing = await findAllUsers({ username: newUsername });
    if (existing.length && existing[0].id !== userId) {
      return next(new AppError('Username taken', 400));
    }
    const user = await findUserById(userId);
    if (!user) return next(new AppError("User not found", 404));
    if (user.username === newUsername) return next(new AppError('Same username.', 400));
    
    await updateUserById(userId, { username: newUsername });
    res.json({ message: 'Username changed', username: newUsername });
  })
];

// Change Password
const changePassword = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  body('confirmNewPassword').custom((v, { req }) => v === req.body.newPassword),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const { currentPassword, newPassword } = req.body;
    const user = await findUserById(req.user.id);
    if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
    if (!(await matchPassword(user, currentPassword))) {
      return next(new AppError('Incorrect current password', 401));
    }
    if (currentPassword === newPassword) return next(new AppError('New password same as current.', 400));
    
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await updateUserById(user.id, { passwordHash: newPasswordHash });
    res.json({ message: 'Password changed' });
  })
];

// Delete Account
const deleteAccount = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.user.id);
  if (!user || user.status === 'deleted') return next(new AppError("User not found or already deleted", 404));
  
  const deletedUsername = `Deleted_Account_${user.id.slice(-6)}`;
  await updateUserById(user.id, {
    username: deletedUsername,
    originalUsername: user.username,
    bio: "This account has been deleted.",
    profilePicture: "",
    isPrivate: true,
    status: 'deleted',
    role: 'deleted',
    passwordHash: await bcrypt.hash(Date.now().toString() + Math.random(), 12),
    followers: [],
    following: [],
    pendingFollowRequests: [],
    savedArticles: [],
    verificationRequestedAt: null
  });
  res.json({ message: 'Account deleted successfully. You have been logged out.' });
});

// Request Verification
const requestVerification = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.user.id);
  if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
  if (user.isVerified) return next(new AppError("Already verified", 400));
  if (user.verificationRequestedAt && (Date.now() - new Date(user.verificationRequestedAt).getTime() < 7 * 24 * 60 * 60 * 1000)) {
    return next(new AppError("Recently requested. Please wait.", 400));
  }
  await updateUserById(user.id, { verificationRequestedAt: new Date().toISOString() });
  res.json({ message: 'Verification request submitted.' });
});

// Get Verification Requests (Admin)
const getVerificationRequests = asyncHandler(async (req, res, next) => {
  const users = await findAllUsers({ status: 'active' });
  const requests = users.filter(u => u.verificationRequestedAt && !u.isVerified);
  res.json(requests);
});

// Approve Verification (Admin)
const approveVerification = [
  param('userId').isString().notEmpty().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const user = await findUserById(req.params.userId);
    if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
    if (user.isVerified) return next(new AppError("Already verified", 400));
    await updateUserById(user.id, { isVerified: true, verificationRequestedAt: null });
    res.json({ message: `${user.username} verified.` });
  })
];

// Search Users
const searchUsers = [
  query('q').trim().notEmpty().isLength({ min: 1, max: 50 }),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const searchQuery = req.query.q;
    const currentUserId = req.user.id;
    const allUsers = await findAllUsers({ status: 'active' });
    const filtered = allUsers.filter(u => 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) && u.id !== currentUserId
    ).slice(0, 20);
    
    const results = await Promise.all(filtered.map(async (u) => {
      const userJson = { ...u };
      userJson.isFollowedByMe = u.followers?.includes(currentUserId) || false;
      userJson.hasPendingRequestFromMe = u.pendingFollowRequests?.includes(currentUserId) || false;
      delete userJson.followers;
      delete userJson.pendingFollowRequests;
      return userJson;
    }));
    res.json(results);
  })
];

// Save Article for User
const saveArticleForUser = [
  body('rootArticleId').isString().notEmpty().trim(),
  body('lineagePathIds').isArray({ min: 1 }),
  body('lineagePathIds.*').isString().notEmpty().trim(),
  body('customName').optional().trim().isLength({ max: 100 }),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const { rootArticleId, lineagePathIds, customName } = req.body;
    const user = await findUserById(req.user.id);
    if (!user) return next(new AppError("User not found", 404));
    
    // Verify all content exists
    for (const id of lineagePathIds) {
      const content = await findContentById(id);
      if (!content) return next(new AppError(`Content ${id} not found`, 404));
    }
    if (lineagePathIds[0] !== rootArticleId) return next(new AppError("Root article mismatch.", 400));
    
    const alreadySaved = user.savedArticles?.some(sa => 
      sa.rootArticle === rootArticleId && 
      JSON.stringify(sa.lineagePathIds) === JSON.stringify(lineagePathIds)
    );
    if (alreadySaved) return next(new AppError("Path already saved.", 400));
    
    const newSavedItem = {
      _id: Date.now().toString(),
      rootArticle: rootArticleId,
      lineagePathIds,
      customName: customName || `Saved Path from ${new Date().toLocaleDateString()}`,
      savedAt: new Date().toISOString(),
      gemsAtSave: 0,
      blockCount: lineagePathIds.length
    };
    user.savedArticles = [...(user.savedArticles || []), newSavedItem];
    await updateUserById(user.id, user);
    res.status(201).json({ message: "Lineage saved.", savedItem: newSavedItem });
  })
];

// Unsave Article
const unsaveArticleForUser = [
  param('savedItemId').isString().notEmpty().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const { savedItemId } = req.params;
    const user = await findUserById(req.user.id);
    if (!user) return next(new AppError("User not found", 404));
    
    const initialLength = user.savedArticles?.length || 0;
    user.savedArticles = (user.savedArticles || []).filter(sa => sa._id !== savedItemId);
    if (user.savedArticles.length === initialLength) return next(new AppError("Item not found.", 404));
    
    await updateUserById(user.id, user);
    res.json({ message: "Unsaved." });
  })
];

// Get Saved Articles
const getSavedArticlesForUser = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));
  
  const savedItems = await Promise.all((user.savedArticles || []).map(async (item) => {
    const rootArticle = await findContentById(item.rootArticle);
    const lineagePathIds = await Promise.all((item.lineagePathIds || []).map(id => findContentById(id)));
    const chainValue = (rootArticle?.likeCount || 0) + lineagePathIds.reduce((sum, seg) => sum + (seg?.likeCount || 0), 0);
    return { ...item, rootArticle, lineagePathIds, chainValue };
  }));
  savedItems.sort((a,b) => new Date(b.savedAt) - new Date(a.savedAt));
  res.json(savedItems);
});

export {
  getUserProfileByUsername,
  followUser,
  unfollowUser,
  getMyFollowers,
  getMyFollowing,
  getMyPendingFollowRequests,
  respondToFollowRequest,
  removeFollower,
  updateUserProfile,
  toggleAccountPrivacy,
  changeUsername,
  changePassword,
  deleteAccount,
  requestVerification,
  getVerificationRequests,
  approveVerification,
  searchUsers,
  saveArticleForUser,
  unsaveArticleForUser,
  getSavedArticlesForUser,
};