/**
 * Stripe 支付配置
 * @see https://stripe.com/docs/stripe-js/react
 */
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export const isStripeEnabled = !!STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!isStripeEnabled) {
    console.log('[Stripe] 未配置 Publishable Key，跳过');
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }

  return stripePromise;
}

/** 发起订阅结账 */
export async function createCheckout(priceId: string): Promise<void> {
  try {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });

    const { url } = await response.json();

    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error('[Stripe] 创建结账失败:', error);
  }
}

/** 跳转到客户管理门户 */
export async function openCustomerPortal(): Promise<void> {
  try {
    const response = await fetch('/api/stripe/portal', {
      method: 'POST',
    });

    const { url } = await response.json();
    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error('[Stripe] 打开管理门户失败:', error);
  }
}
