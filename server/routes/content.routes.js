// Rewrite/server/routes/content.routes.js
import express from 'express';
import {
  getFilteredContent,
  getMyPageFeed,
  getExploreFeed,
  getContentById,
  getContentLineage,
  getContentVersions,
  createContent,
  updateContent,
  publishVersion,
  trackView,
  toggleLikeContent,
  reportContent,
  getArticlesByUser,
  toggleArticlePrivacy,
  getAllContentForAdmin,
  deleteContentForAdmin,
} from '../controllers/content.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- Feed Routes ---
router.get('/feed/my-page', protect, getMyPageFeed);
router.get('/feed/explore', protect, getExploreFeed);

// --- General Content Routes ---
router.get('/', getFilteredContent);
router.get('/user/:userId', protect, getArticlesByUser);
router.get('/:id', getContentById);
router.get('/:id/lineage', getContentLineage);
router.get('/:id/versions', getContentVersions);

// --- Protected Content Actions ---
router.post('/', protect, createContent);
router.put('/:id', protect, updateContent);
router.post('/:id/publish', protect, publishVersion); // NEW: Publish version
router.post('/:id/view', trackView); // NEW: Track view (public)
router.put('/:articleId/privacy', protect, toggleArticlePrivacy);
router.post('/:id/like', protect, toggleLikeContent);
router.post('/:id/report', protect, reportContent);

// --- Admin Routes ---
router.get('/admin/all', protect, admin, getAllContentForAdmin);
router.delete('/admin/:id', protect, admin, deleteContentForAdmin);
//import { publishVersion } from '../controllers/content.controller.js';

// Add this route
//router.post('/:id/publish', protect, publishVersion);


export default router;