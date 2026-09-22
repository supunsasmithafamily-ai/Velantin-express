export const PRIVATE_ROOM_MIN_PRICE = 25;
export const PRIVATE_ROOM_MAX_PRICE = 10_000;

export const SUBSCRIPTION_PLANS = [
  {
    id: 'supporter',
    name: 'Supporter',
    durationDays: 30,
    priceCoins: 500,
    description: 'Unlock subscriber-only rooms and a supporter badge.',
  },
  {
    id: 'insider',
    name: 'Insider',
    durationDays: 30,
    priceCoins: 1_200,
    description: 'Priority access to private rooms and exclusive creator drops.',
  },
  {
    id: 'vip',
    name: 'VIP',
    durationDays: 30,
    priceCoins: 2_500,
    description: 'Premium access across every creator you subscribe to.',
  },
] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number]['id'];

export function getSubscriptionPlan(planId: string) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) ?? null;
}

export function isValidPrivateRoomPrice(value: number) {
  return Number.isInteger(value) && value >= PRIVATE_ROOM_MIN_PRICE && value <= PRIVATE_ROOM_MAX_PRICE;
}
