import express from 'express';
import { register, login, getProfile, googleLogin } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.post('/google', googleLogin);
router.get('/google/callback', googleLogin);

export default router;
