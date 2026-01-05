/**
 * Stripe Integration for Pack Attack
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 * - STRIPE_PUBLISHABLE_KEY: Your Stripe publishable key (pk_test_... or pk_live_...)
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret (whsec_...)
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Initialize Stripe client
export const stripe = STRIPE_SECRET_KEY 
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null;

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!(STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
}

/**
 * Get Stripe publishable key for frontend
 */
export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

/**
 * Coin packages with Stripe price mapping
 */
export const COIN_PACKAGES = [
  { amount: 500, price: 5, priceInCents: 500 },
  { amount: 1000, price: 10, priceInCents: 1000 },
  { amount: 2500, price: 25, priceInCents: 2500 },
  { amount: 5000, price: 50, priceInCents: 5000 },
  { amount: 10000, price: 100, priceInCents: 10000 },
  { amount: 25000, price: 250, priceInCents: 25000 },
];

/**
 * Get package by price
 */
export function getPackageByPrice(priceInEuros: number) {
  return COIN_PACKAGES.find(pkg => pkg.price === priceInEuros);
}

/**
 * Create a Stripe Checkout Session
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  coins: number,
  priceInCents: number,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${coins.toLocaleString()} Pack Attack Coins`,
            description: 'Virtual currency for opening packs and joining battles',
            images: ['https://pack-attack.de/coin-icon.png'],
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      coins: coins.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

/**
 * Retrieve a Checkout Session
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return null;
  }
}

/**
 * Construct and verify webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}


