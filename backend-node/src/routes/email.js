/**
 * 邮件路由 — Resend
 */
import { Router } from 'express';
import { sendWelcomeEmail, sendDigestEmail, isResendEnabled } from '../lib/resend.js';
import { requireClerkAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/email/welcome
router.post('/welcome', requireClerkAuth(), async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: '缺少邮箱' });
    }

    await sendWelcomeEmail(email, username);
    res.json({ success: true, message: isResendEnabled ? '已发送' : '已模拟发送' });
  } catch (error) {
    console.error('[Email] 发送失败:', error);
    res.status(500).json({ success: false, message: '发送失败' });
  }
});

// POST /api/email/digest
router.post('/digest', requireClerkAuth(), async (req, res) => {
  try {
    const { email, stories } = req.body;
    if (!email || !stories) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }

    await sendDigestEmail(email, stories);
    res.json({ success: true, message: '已发送' });
  } catch (error) {
    console.error('[Email] 日报发送失败:', error);
    res.status(500).json({ success: false, message: '发送失败' });
  }
});

export default router;
