/**
 * Stripe 支付服务
 * @see https://stripe.com/docs/api
 */
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export const isStripeEnabled = !!STRIPE_SECRET_KEY;

let stripe = null;

if (isStripeEnabled) {
  stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  console.log('[Stripe] 支付客户端初始化完成');
} else {
  console.log('[Stripe] 未配置，支付功能不可用');
}

// --- 创建结账会话 ---
export async function createCheckoutSession({ priceId, customerId, successUrl, cancelUrl }) {
  if (!stripe) throw new Error('Stripe 未配置');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId || undefined,
    success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/`,
  });

  return session;
}

// --- 创建客户门户会话 ---
export async function createPortalSession(customerId) {
  if (!stripe) throw new Error('Stripe 未配置');

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/`,
  });

  return session;
}

// --- 处理 Webhook ---
export function constructWebhookEvent(body, signature) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) throw new Error('Stripe Webhook 未配置');
  return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
}

// --- 创建/获取客户 ---
export async function findOrCreateCustomer(email, clerkUserId) {
  if (!stripe) return null;

  const customers = await stripe.customers.list({ email, limit: 1 });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  return stripe.customers.create({
    email,
    metadata: { clerk_user_id: clerkUserId },
  });
}

export { stripe, STRIPE_WEBHOOK_SECRET };
