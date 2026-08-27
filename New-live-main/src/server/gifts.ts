// ---------------------------------------------------------------------------
// Server-side gift catalog
// ---------------------------------------------------------------------------
// The coin cost and diamond payout for a gift must NEVER be trusted from the
// client — the ws-service previously accepted whatever `coins`/`diamonds`
// numbers a socket event carried, which let a modified client mint diamonds
// (real payable money) for free. Every gift send now looks the id up here
// and computes the diamond payout server-side.
// ---------------------------------------------------------------------------

export interface GiftDefinition {
  id: string;
  name: string;
  coins: number;
}

export const GIFT_CATALOG: GiftDefinition[] = [
  { id: "rose", name: "Rose", coins: 10 },
  { id: "pulse", name: "Pulse", coins: 50 },
  { id: "boost", name: "Boost", coins: 120 },
  { id: "spotlight", name: "Spotlight", coins: 300 },
  { id: "crown", name: "Crown", coins: 900 },
];

const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? "0.30");

export function getGiftById(id: string): GiftDefinition | undefined {
  return GIFT_CATALOG.find((g) => g.id === id);
}

export function coinsToDiamonds(coins: number): number {
  return Math.max(0, Math.floor(coins * (1 - PLATFORM_FEE_RATE)));
}
