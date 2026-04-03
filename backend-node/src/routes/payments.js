/**
 * Stripe 支付路由
 */
import { Router } from 'express';
import { isStripeEnabled, createCheckoutSession, createPortalSession, constructWebhookEvent } from '../lib/stripe.js';
import { requireClerkAuth } from '../middleware/auth.js';
import express from 'express';

const router = Router();

// POST /api/stripe/checkout — 创建结账会话
router.post('/checkout', requireClerkAuth(), async (req, res) => {
  if (!isStripeEnabled) {
    return res.status(503).json({ success: false, message: 'Stripe 未配置' });
  }

  try {
    const { priceId } = req.body;
    const session = await createCheckoutSession({
      priceId,
      successUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/`,
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('[Stripe] 创建结账失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/stripe/portal — 客户管理门户
router.post('/portal', requireClerkAuth(), async (req, res) => {
  if (!isStripeEnabled) {
    return res.status(503).json({ success: false, message: 'Stripe 未配置' });
  }

  try {
    const { customerId } = req.body;
    const session = await createPortalSession(customerId);
    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('[Stripe] 创建门户失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/stripe/webhook — Webhook 处理
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!isStripeEnabled) {
    return res.status(503).send('Stripe 未配置');
  }

  try {
    const sig = req.headers['stripe-signature'];
    const event = constructWebhookEvent(req.body, sig);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('[Stripe] 结账完成:', event.data.object.id);
        // TODO: 更新用户订阅状态
        break;
      case 'customer.subscription.updated':
        console.log('[Stripe] 订阅更新:', event.data.object.id);
        break;
      case 'customer.subscription.deleted':
        console.log('[Stripe] 订阅取消:', event.data.object.id);
        break;
      default:
        console.log(`[Stripe] 未处理事件: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe] Webhook 验证失败:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;
