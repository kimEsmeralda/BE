import express from 'express';
import db from '../models/database.js';
import webpush from 'web-push';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:pokedexadmin@tudominio.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.error('Error configurando VAPID_KEYS para web-push:', err.message);
  }
} else {
  console.warn('VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY no estÃ¡n definidos. Las notificaciones push podrÃ­an no funcionar.');
}

// Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.userId;

    // Save subscription to user in DB
    await db.none('UPDATE users SET push_subscription = $1 WHERE id = $2', [subscription, userId]);

    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Server error saving subscription' });
  }
});

// Helper function to send push notifications
export const sendPushNotification = async (userId, payload) => {
  try {
    const user = await db.oneOrNone('SELECT push_subscription FROM users WHERE id = $1', [userId]);
    
    if (user && user.push_subscription) {
      await webpush.sendNotification(user.push_subscription, JSON.stringify(payload));
      console.log(`Push notification sent to user ${userId}`);
    }
  } catch (error) {
    // If the subscription is expired/invalid, remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`Subscription expired for user ${userId}, removing from DB.`);
      await db.none('UPDATE users SET push_subscription = NULL WHERE id = $1', [userId]);
    } else {
      console.error(`Error sending push to user ${userId}:`, error);
    }
  }
};

export default router;