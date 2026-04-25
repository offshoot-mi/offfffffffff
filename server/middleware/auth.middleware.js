import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { findUserById } from '../services/user.service.js';
import AppError from '../utils/AppError.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await findUserById(decoded.id);
      if (!user || user.status !== 'active') {
        return next(new AppError('No active user found with this token', 401));
      }
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return next(new AppError('Not authorized, token failed', 401));
    }
  }
  if (!token) {
    return next(new AppError('Not authorized, no token provided', 401));
  }
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(`User role '${req.user?.role || 'guest'}' is not authorized`, 403));
  }
  next();
};

const admin = authorize('admin');

export { protect, admin, authorize };