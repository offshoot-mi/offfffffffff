// /server/controllers/content.controller.js
import asyncHandler from 'express-async-handler';
import { body, param, validationResult } from 'express-validator';
import {
  findAllContents,
  findContentById,
  createContent as createContentService,
  updateContentById,
  deleteContentById,
  addVersion,
  publishVersion as publishVersionService,
  trackView as trackViewService,
  populateContent,
  findContentByParent,
  recalculateAllChainValues
} from '../services/content.service.js';
import { findUserById, updateUserById, addGemsFromPublication } from '../services/user.service.js';
import AppError from '../utils/AppError.js';

const checkValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    next(new AppError(errorMessages, 400));
    return false;
  }
  return true;
};

// ----------------------------------------------------------------------
// Feed Controllers
// ----------------------------------------------------------------------
export const getFilteredContent = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const view = req.query.view;
  const feedType = req.query.feedType;
  const sortBy = req.query.sortBy;
  const filter = {};

  if (req.query.parentContent === 'null') filter.parentContent = null;
  else if (req.query.parentContent && req.query.parentContent !== 'null') filter.parentContent = req.query.parentContent;
  else if (!req.query.parentContent) filter.parentContent = null;

  if (feedType === 'popular' || (filter.parentContent === null && !feedType && sortBy !== 'truePopularity_desc')) {
    filter.isPrivateToFollowers = false;
  }
  if (sortBy === 'truePopularity_desc') {
    filter.parentContent = null;
    filter.isPrivateToFollowers = false;
  }

  let sortOptions = { createdAt: -1 };
  if (sortBy === 'likes_desc' || feedType === 'popular') sortOptions = { likeCount: -1, createdAt: -1 };
  else if (sortBy === 'createdAt_asc') sortOptions = { createdAt: 1 };

  const { contents, total } = await findAllContents(filter, sortOptions, skip, limit);
  const populatedContents = await Promise.all(contents.map(c => populateContent(c)));

  if (view === 'titles') {
    const titlesOnly = populatedContents.map(c => ({
      id: c.id,
      title: c.title,
      author: c.author,
      createdAt: c.createdAt,
      isPrivateToFollowers: c.isPrivateToFollowers,
      likeCount: c.likeCount,
      totalGems: c.totalGems,
      chainValue: c.currentChainValue || c.totalGems || 0,
    }));
    return res.json({ articles: titlesOnly, page, pages: Math.ceil(total / limit), totalArticles: total });
  }
  res.json({ articles: populatedContents, page, pages: Math.ceil(total / limit), totalArticles: total });
});

export const getMyPageFeed = asyncHandler(async (req, res, next) => {
  const currentUserId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const currentUser = await findUserById(currentUserId);
  if (!currentUser || !currentUser.following || currentUser.following.length === 0) {
    return res.json({ articles: [], page: 1, pages: 0, totalArticles: 0 });
  }

  const filter = { author: { $in: currentUser.following }, parentContent: null };
  const { contents, total } = await findAllContents(filter, { createdAt: -1 }, skip, limit);
  const populated = await Promise.all(contents.map(c => populateContent(c)));
  res.json({ articles: populated, page, pages: Math.ceil(total / limit), totalArticles: total });
});

export const getExploreFeed = asyncHandler(async (req, res, next) => {
  const currentUserId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const currentUser = await findUserById(currentUserId);
  const myFollowingIds = currentUser?.following || [];

  const { contents: allContents } = await findAllContents(
    { parentContent: null, isPrivateToFollowers: false },
    { likeCount: -1, createdAt: -1 },
    0,
    100
  );
  const filtered = allContents.filter(c => !myFollowingIds.includes(c.author) && c.author !== currentUserId);
  const paginated = filtered.slice(skip, skip + limit);
  const populated = await Promise.all(paginated.map(c => populateContent(c)));

  res.json({
    articles: populated,
    page,
    pages: Math.ceil(filtered.length / limit),
    totalArticles: filtered.length,
    type: 'explore',
  });
});

// ----------------------------------------------------------------------
// Single Content & Lineage
// ----------------------------------------------------------------------
export const getContentById = [
  param('id').isString().notEmpty().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    let content = await findContentById(req.params.id);
    if (!content) return next(new AppError('Content not found', 404));

    if (req.user?.id) {
      trackViewService(content, content.currentVersion, req.user.id);
      await updateContentById(content.id, content);
    }

    const populated = await populateContent(content);
    res.json(populated);
  }),
];

export const getContentLineage = [
  param('id').isString().notEmpty().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const lineage = [];
    let currentId = req.params.id;
    const MAX_DEPTH = 15;

    while (currentId && lineage.length < MAX_DEPTH) {
      let contentItem = await findContentById(currentId);
      if (!contentItem) break;

      // Ensure versions exist (migration for old data)
      if (!contentItem.versions || contentItem.versions.length === 0) {
        const plainText = contentItem.text.replace(/<[^>]*>/g, '');
        const characterCount = plainText.replace(/\s/g, '').length;
        contentItem.versions = [{
          versionNumber: 1,
          title: contentItem.title || null,
          text: contentItem.text,
          characterCount,
          contributors: [{ user: contentItem.author, contribution: 100, contributedAt: contentItem.createdAt || new Date().toISOString() }],
          likes: contentItem.likes || [],
          likeCount: contentItem.likeCount || 0,
          views: 0,
          uniqueReaders: [],
          createdAt: contentItem.createdAt || new Date().toISOString(),
          published: true,
          publishedAt: contentItem.createdAt || new Date().toISOString(),
          gemsEarned: Math.round((characterCount * 0.05) * 100) / 100,
          rawGems: Math.round((characterCount * 0.05) * 100) / 100,
          chainValue: Math.round((characterCount * 0.05) * 100) / 100,
          miningReward: Math.round((characterCount * 0.05) * 0.1 * 100) / 100,
          appreciation: 0,
          noveltyMultiplier: 2.0,
          noveltyBonusType: 'version_first'
        }];
        contentItem.currentVersion = 1;
        contentItem.collaborators = [contentItem.author];
        contentItem.characterCount = characterCount;
        contentItem.totalGems = Math.round((characterCount * 0.05) * 100) / 100;
        await updateContentById(contentItem.id, contentItem);
      } else {
        // Ensure chain values exist for all versions
        let needsRecalc = false;
        for (const version of contentItem.versions) {
          if (version.chainValue === undefined) {
            version.chainValue = version.gemsEarned || 0;
            needsRecalc = true;
          }
          if (version.miningReward === undefined) {
            version.miningReward = 0;
            needsRecalc = true;
          }
          if (version.appreciation === undefined) {
            version.appreciation = 0;
            needsRecalc = true;
          }
        }
        if (needsRecalc) {
          recalculateAllChainValues(contentItem);
          await updateContentById(contentItem.id, contentItem);
        }
      }

      const populated = await populateContent(contentItem);
      lineage.push(populated);

      const children = await findContentByParent(contentItem.id);
      const nextChild = children.find(c => !c.isPrivateToFollowers);
      currentId = nextChild ? nextChild.id : null;
    }

    if (lineage.length === 0) return next(new AppError('No content found for this lineage.', 404));
    res.json(lineage);
  }),
];

export const getContentVersions = [
  param('id').isString().notEmpty().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const contentItem = await findContentById(req.params.id);
    if (!contentItem || !contentItem.parentContent) return res.json([]);

    const siblings = await findContentByParent(contentItem.parentContent);
    const filtered = siblings.filter(s => s.id !== req.params.id && !s.isPrivateToFollowers);
    const populated = await Promise.all(filtered.map(s => populateContent(s)));
    res.json(populated);
  }),
];

// ----------------------------------------------------------------------
// Content Creation & Editing
// ----------------------------------------------------------------------
export const createContent = [
  body('text').trim().isLength({ min: 1, max: 10000 }),
  body('title').optional().trim().isLength({ max: 150 }),
  body('parentContent').optional({ checkFalsy: true }).isString().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const { title, text, parentContent } = req.body;
    const plainText = text.replace(/<[^>]*>/g, '');
    const characterCount = plainText.replace(/\s/g, '').length;

    if (parentContent) {
      const parent = await findContentById(parentContent);
      if (!parent) return next(new AppError('Parent content not found', 404));
    }

    const content = await createContentService({
      author: req.user.id,
      text: text.trim(),
      title: title?.trim() || null,
      parentContent: parentContent || null,
      isPrivateToFollowers: false,
      characterCount,
    });

    // Add initial version with chain values
    content.versions = [{
      versionNumber: 1,
      title: title || null,
      text: text.trim(),
      characterCount,
      contributors: [{ user: req.user.id, contribution: 100, contributedAt: new Date().toISOString() }],
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
      noveltyMultiplier: 2.0,
      noveltyBonusType: 'version_first'
    }];
    content.currentVersion = 1;
    content.collaborators = [req.user.id];
    content.totalGems = 0;

    await updateContentById(content.id, content);
    const populated = await populateContent(content);
    res.status(201).json(populated);
  }),
];

export const updateContent = [
  param('id').isString().notEmpty().trim(),
  body('text').trim().isLength({ min: 1, max: 10000 }),
  body('title').optional().trim().isLength({ max: 150 }),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    let content = await findContentById(req.params.id);
    if (!content) return next(new AppError('Content not found', 404));
    if (content.author !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    const { text, title } = req.body;
    addVersion(content, title || content.title, text, req.user.id);
    content.text = text;

    await updateContentById(content.id, content);
    const populated = await populateContent(content);
    res.json(populated);
  }),
];

// ----------------------------------------------------------------------
// Publishing & Gems
// ----------------------------------------------------------------------
export const publishVersion = [
  param('id').isString().notEmpty().trim(),
  body('versionNumber').isInt({ min: 1 }),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    let content = await findContentById(req.params.id);
    if (!content) return next(new AppError('Content not found', 404));
    if (content.author !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    const { versionNumber } = req.body;
    const result = publishVersionService(content, versionNumber);
    if (result.error) return next(new AppError(result.error, 400));

    // Award gems to contributors
    const version = content.versions.find(v => v.versionNumber === versionNumber);
    if (version && version.contributors) {
      for (const contributor of version.contributors) {
        const user = await findUserById(contributor.user);
        if (user) {
          const contributorGems = (result.gemsEarned * contributor.contribution) / 100;
          addGemsFromPublication(
            user,
            content.id,
            versionNumber,
            contributorGems,
            version.title || content.title,
            version.contributors.length,
            { noveltyMultiplier: version.noveltyMultiplier, noveltyBonusType: version.noveltyBonusType }
          );
          await updateUserById(user.id, user);
        }
      }
    }

    // Save the updated content with all chain values
    await updateContentById(content.id, content);
    
    // Fetch fresh copy to return
    const updatedContent = await findContentById(content.id);
    const updatedVersion = updatedContent.versions.find(v => v.versionNumber === versionNumber);
    
    res.json({
      success: true,
      message: 'Version published successfully',
      gemsEarned: result.gemsEarned,
      totalGems: result.totalGems,
      chainValue: updatedVersion?.chainValue || result.gemsEarned,
      miningReward: updatedVersion?.miningReward || 0,
      appreciation: updatedVersion?.appreciation || 0,
      version: updatedVersion
    });
  }),
];

export const trackView = [
  param('id').isString().notEmpty().trim(),
  body('versionNumber').isInt({ min: 1 }),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    let content = await findContentById(req.params.id);
    if (!content) return next(new AppError('Content not found', 404));

    const { versionNumber } = req.body;
    const userId = req.user?.id || null;
    trackViewService(content, versionNumber, userId);
    await updateContentById(content.id, content);
    res.json({ success: true, views: content.totalViews });
  }),
];

// ----------------------------------------------------------------------
// Likes & Reports
// ----------------------------------------------------------------------
export const toggleLikeContent = [
  param('id').isString().notEmpty().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    let content = await findContentById(req.params.id);
    if (!content) return next(new AppError('Content not found', 404));

    const userId = req.user.id;
    const alreadyLiked = content.likes?.includes(userId) || false;

    if (alreadyLiked) {
      content.likes = content.likes.filter(id => id !== userId);
    } else {
      content.likes = [...(content.likes || []), userId];
    }
    content.likeCount = content.likes.length;

    await updateContentById(content.id, content);
    res.json({ id: content.id, likes: content.likes, likeCount: content.likeCount });
  }),
];

export const reportContent = [
  param('id').isString().notEmpty().trim(),
  body('reason').optional().trim().isLength({ max: 200 }),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    let content = await findContentById(req.params.id);
    if (!content) return next(new AppError('Content not found', 404));

    const userId = req.user.id;
    const alreadyReported = content.reports?.some(r => r.reporter === userId) || false;
    if (alreadyReported) return next(new AppError('You have already reported this content', 400));

    content.reports = [...(content.reports || []), {
      reporter: userId,
      reason: req.body.reason || 'No reason provided',
      reportedAt: new Date().toISOString(),
    }];
    content.isReported = content.reports.length > 0;

    await updateContentById(content.id, content);
    const populated = await populateContent(content);
    res.json(populated);
  }),
];

// ----------------------------------------------------------------------
// User Articles & Privacy (with chain values)
// ----------------------------------------------------------------------
export const getArticlesByUser = [
  param('userId').isString().notEmpty().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const authorId = req.params.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const authorProfile = await findUserById(authorId);
    if (!authorProfile) return next(new AppError('Author not found', 404));

    const filter = { author: authorId, parentContent: null };
    const currentUserId = req.user?.id;
    let canViewPrivate = false;

    if (currentUserId) {
      if (currentUserId === authorId || req.user?.role === 'admin') canViewPrivate = true;
      else if (authorProfile.followers?.includes(currentUserId)) canViewPrivate = true;
    }
    if (!canViewPrivate) filter.isPrivateToFollowers = false;

    const { contents, total } = await findAllContents(filter, { createdAt: -1 }, skip, limit);
    
    // Enrich each article with chain value data
    const enrichedContents = await Promise.all(contents.map(async (c) => {
      const fullContent = await findContentById(c.id);
      const currentVersion = fullContent?.versions?.find(v => v.versionNumber === fullContent.currentVersion);
      return {
        ...c,
        chainValue: currentVersion?.chainValue || c.totalGems || 0,
        miningReward: currentVersion?.miningReward || 0,
        appreciation: currentVersion?.appreciation || 0,
        currentChainValue: currentVersion?.chainValue || c.totalGems || 0,
        currentMiningReward: currentVersion?.miningReward || 0,
        currentAppreciation: currentVersion?.appreciation || 0
      };
    }));
    
    const populated = await Promise.all(enrichedContents.map(c => populateContent(c)));

    res.json({ articles: populated, page, pages: Math.ceil(total / limit), totalArticles: total });
  }),
];

export const toggleArticlePrivacy = [
  param('articleId').isString().notEmpty().trim(),
  body('isPrivateToFollowers').isBoolean(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const articleId = req.params.articleId;
    const { isPrivateToFollowers } = req.body;
    let content = await findContentById(articleId);
    if (!content) return next(new AppError('Article not found', 404));
    if (content.author !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    content.isPrivateToFollowers = isPrivateToFollowers;
    await updateContentById(content.id, content);
    res.json({ message: 'Privacy updated', articleId: content.id, isPrivateToFollowers });
  }),
];

// ----------------------------------------------------------------------
// Admin Routes
// ----------------------------------------------------------------------
export const getAllContentForAdmin = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 500;
  const skip = (page - 1) * limit;

  const { contents, total } = await findAllContents({}, { createdAt: -1 }, skip, limit);
  const populated = await Promise.all(contents.map(c => populateContent(c)));

  res.json({ content: populated, page, pages: Math.ceil(total / limit), totalContent: total });
});

export const deleteContentForAdmin = [
  param('id').isString().notEmpty().trim(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const contentId = req.params.id;
    const content = await findContentById(contentId);
    if (!content) return next(new AppError('Content not found', 404));

    const deleteChildren = async (parentId) => {
      const children = await findContentByParent(parentId);
      for (const child of children) {
        await deleteChildren(child.id);
        await deleteContentById(child.id);
      }
    };
    await deleteChildren(contentId);
    await deleteContentById(contentId);

    res.json({ message: 'Content deleted' });
  }),
];