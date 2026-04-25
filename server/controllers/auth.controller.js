import asyncHandler from 'express-async-handler';
import { body, param, validationResult } from 'express-validator';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { findOneUser, createUser, updateUserById, matchPassword, getEmailVerificationToken, getPasswordResetToken } from '../services/user.service.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import AppError from '../utils/AppError.js';
import { getGoogleClient } from '../config/google.config.js';

const checkValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    next(new AppError(errorMessages, 400));
    return false;
  }
  return true;
};

// Register User
const registerUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores.'),
  body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const { username, email, password } = req.body;

    const userExists = await findOneUser({ $or: [{ email }, { username }] });
    if (userExists) {
      if (userExists.email === email) return next(new AppError('An account with this email already exists', 400));
      if (userExists.username === username) return next(new AppError('Username is already taken', 400));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ 
      username, 
      email, 
      passwordHash,
      agreedToTerms: true,
      isEmailVerified: false,
      role: 'user',
      status: 'active'
    });
    
    const verificationToken = getEmailVerificationToken(user);
    await updateUserById(user.id, {
      emailVerificationToken: user.emailVerificationToken,
      emailVerificationExpires: user.emailVerificationExpires
    });

    const verifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    const htmlMessage = `
      <h1>Email Verification</h1>
      <p>Hi ${user.username},</p>
      <p>Thank you for registering! Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyURL}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
      <p>Or copy this link: ${verifyURL}</p>
      <p>This link will expire in 24 hours.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Rewrite Account - Email Verification',
        html: htmlMessage,
      });
      
      res.status(201).json({ 
        success: true, 
        message: 'Registration successful! Verification email sent.' 
      });
    } catch (err) {
      await updateUserById(user.id, { emailVerificationToken: null, emailVerificationExpires: null });
      console.error('Email send error:', err);
      return next(new AppError('Account created but verification email could not be sent. Please try resending verification.', 500));
    }
  }),
];

// Verify Email
const verifyEmail = [
  body('token').notEmpty().withMessage('Verification token is required.'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const users = await import('../services/user.service.js').then(m => m.getUsers());
    const user = users.find(u => u.emailVerificationToken === hashedToken && u.emailVerificationExpires > Date.now());
    
    if (!user) return next(new AppError('Invalid or expired verification token.', 400));

    await updateUserById(user._id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  }),
];

// Login User
const loginUser = [
  body('username').notEmpty().withMessage('Username or Email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const { username, password } = req.body;
    const user = await findOneUser({ $or: [{ username }, { email: username.toLowerCase() }] });

    if (!user || !(await matchPassword(user, password))) {
      return next(new AppError('Invalid credentials', 401));
    }

    if (!user.isEmailVerified) {
      return next(new AppError('Please verify your email before logging in.', 401));
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isPrivate: user.isPrivate,
      createdAt: user.createdAt,
      token: generateToken(user.id, user.role),
    });
  }),
];

// Forgot Password
const forgotPassword = [
  body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const user = await findOneUser({ email: req.body.email });
    
    if (!user) {
      return res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
    }

    const resetToken = getPasswordResetToken(user);
    await updateUserById(user.id, {
      passwordResetToken: user.passwordResetToken,
      passwordResetExpires: user.passwordResetExpires
    });

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const htmlMessage = `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.username},</p>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetURL}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>This link will expire in 10 minutes.</p>
    `;

    try {
      await sendEmail({ email: user.email, subject: 'Rewrite - Password Reset Request', html: htmlMessage });
      res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
    } catch (err) {
      await updateUserById(user.id, { passwordResetToken: null, passwordResetExpires: null });
      console.error('Password reset email error:', err);
      return next(new AppError('Error sending reset email. Please try again.', 500));
    }
  }),
];

// Reset Password
const resetPassword = [
  param('token').notEmpty().withMessage('Reset token is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const users = await import('../services/user.service.js').then(m => m.getUsers());
    const user = users.find(u => u.passwordResetToken === hashedToken && u.passwordResetExpires > Date.now());
    
    if (!user) return next(new AppError('Invalid or expired reset token.', 400));

    const newPasswordHash = await bcrypt.hash(req.body.password, 12);
    await updateUserById(user._id, {
      passwordHash: newPasswordHash,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    const htmlMessage = `<h1>Password Reset Successful</h1><p>Hi ${user.username}, your password has been reset.</p>`;
    try {
      await sendEmail({ email: user.email, subject: 'Rewrite - Password Reset Successful', html: htmlMessage });
    } catch (err) { /* ignore */ }

    res.json({ success: true, message: 'Password reset successful! You can now log in.' });
  }),
];

// Get Current User Profile
const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await import('../services/user.service.js').then(m => m.findUserById(req.user.id));
  if (!user) return next(new AppError('User not found', 404));
  res.json(user);
});

// Google Login
const googleLogin = asyncHandler(async (req, res, next) => {
  const googleClient = getGoogleClient();
  if (!googleClient) {
    return next(new AppError('Google authentication is not configured.', 503));
  }

  const { token } = req.body;
  if (!token) return next(new AppError('Google token missing', 400));

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub, picture } = payload;

    let user = await findOneUser({ email });
    if (!user) {
      let baseUsername = name ? name.replace(/\s+/g, '').toLowerCase() : 'user';
      let username = baseUsername;
      let counter = 0;
      while (await findOneUser({ username })) {
        counter++;
        username = `${baseUsername}${counter}`;
      }
      const randomPassword = crypto.randomBytes(20).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      user = await createUser({
        username,
        email,
        googleId: sub,
        isEmailVerified: true,
        passwordHash,
        profilePicture: picture || '',
        role: 'user',
        status: 'active'
      });
    } else if (!user.googleId) {
      await updateUserById(user.id, { googleId: sub, isEmailVerified: true });
      user = await findOneUser({ email });
    }

    const authToken = generateToken(user.id, user.role);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isPrivate: user.isPrivate,
      createdAt: user.createdAt,
      token: authToken,
    });
  } catch (err) {
    console.error('Google verification failed:', err);
    return next(new AppError('Google authentication failed. Please try again.', 401));
  }
});

export {
  registerUser,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
  getUserProfile,
  googleLogin,
};