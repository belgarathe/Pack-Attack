// Achievement System Definitions
// Each achievement has unique icon, category, rarity, and requirements

export type AchievementDefinition = {
  code: string;
  name: string;
  description: string;
  category: 'PULLS' | 'BATTLES' | 'COLLECTION' | 'ECONOMY' | 'SOCIAL' | 'SPECIAL';
  icon: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  requirement: number;
  coinReward: number;
  isSecret: boolean;
  sortOrder: number;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ============================================
  // PULLS CATEGORY - Pack Opening Achievements
  // ============================================
  {
    code: 'FIRST_PULL',
    name: 'First Steps',
    description: 'Open your very first pack',
    category: 'PULLS',
    icon: 'Sparkles',
    rarity: 'COMMON',
    requirement: 1,
    coinReward: 10,
    isSecret: false,
    sortOrder: 1,
  },
  {
    code: 'PACK_ENTHUSIAST',
    name: 'Pack Enthusiast',
    description: 'Open 25 packs',
    category: 'PULLS',
    icon: 'Package',
    rarity: 'COMMON',
    requirement: 25,
    coinReward: 50,
    isSecret: false,
    sortOrder: 2,
  },
  {
    code: 'PACK_ADDICT',
    name: 'Pack Addict',
    description: 'Open 100 packs',
    category: 'PULLS',
    icon: 'Flame',
    rarity: 'UNCOMMON',
    requirement: 100,
    coinReward: 150,
    isSecret: false,
    sortOrder: 3,
  },
  {
    code: 'PACK_MASTER',
    name: 'Pack Master',
    description: 'Open 500 packs',
    category: 'PULLS',
    icon: 'Zap',
    rarity: 'RARE',
    requirement: 500,
    coinReward: 500,
    isSecret: false,
    sortOrder: 4,
  },
  {
    code: 'PACK_LEGEND',
    name: 'Pack Legend',
    description: 'Open 1,000 packs',
    category: 'PULLS',
    icon: 'Crown',
    rarity: 'EPIC',
    requirement: 1000,
    coinReward: 1500,
    isSecret: false,
    sortOrder: 5,
  },
  {
    code: 'PACK_GOD',
    name: 'Pack God',
    description: 'Open 5,000 packs',
    category: 'PULLS',
    icon: 'Star',
    rarity: 'LEGENDARY',
    requirement: 5000,
    coinReward: 5000,
    isSecret: false,
    sortOrder: 6,
  },

  // ============================================
  // BATTLES CATEGORY - Battle Achievements
  // ============================================
  {
    code: 'FIRST_BATTLE',
    name: 'Battle Ready',
    description: 'Join your first battle',
    category: 'BATTLES',
    icon: 'Swords',
    rarity: 'COMMON',
    requirement: 1,
    coinReward: 15,
    isSecret: false,
    sortOrder: 10,
  },
  {
    code: 'FIRST_VICTORY',
    name: 'Taste of Victory',
    description: 'Win your first battle',
    category: 'BATTLES',
    icon: 'Trophy',
    rarity: 'COMMON',
    requirement: 1,
    coinReward: 25,
    isSecret: false,
    sortOrder: 11,
  },
  {
    code: 'BATTLE_VETERAN',
    name: 'Battle Veteran',
    description: 'Participate in 50 battles',
    category: 'BATTLES',
    icon: 'Shield',
    rarity: 'UNCOMMON',
    requirement: 50,
    coinReward: 200,
    isSecret: false,
    sortOrder: 12,
  },
  {
    code: 'VICTORY_STREAK',
    name: 'Victory Streak',
    description: 'Win 10 battles',
    category: 'BATTLES',
    icon: 'Medal',
    rarity: 'UNCOMMON',
    requirement: 10,
    coinReward: 150,
    isSecret: false,
    sortOrder: 13,
  },
  {
    code: 'BATTLE_CHAMPION',
    name: 'Battle Champion',
    description: 'Win 50 battles',
    category: 'BATTLES',
    icon: 'Award',
    rarity: 'RARE',
    requirement: 50,
    coinReward: 750,
    isSecret: false,
    sortOrder: 14,
  },
  {
    code: 'BATTLE_LEGEND',
    name: 'Battle Legend',
    description: 'Win 100 battles',
    category: 'BATTLES',
    icon: 'Crown',
    rarity: 'EPIC',
    requirement: 100,
    coinReward: 2000,
    isSecret: false,
    sortOrder: 15,
  },

  // ============================================
  // COLLECTION CATEGORY - Collection Achievements
  // ============================================
  {
    code: 'RARE_FINDER',
    name: 'Rare Finder',
    description: 'Pull your first rare card',
    category: 'COLLECTION',
    icon: 'Gem',
    rarity: 'COMMON',
    requirement: 1,
    coinReward: 20,
    isSecret: false,
    sortOrder: 20,
  },
  {
    code: 'MYTHIC_HUNTER',
    name: 'Mythic Hunter',
    description: 'Pull 5 mythic cards',
    category: 'COLLECTION',
    icon: 'Sparkles',
    rarity: 'RARE',
    requirement: 5,
    coinReward: 300,
    isSecret: false,
    sortOrder: 21,
  },
  {
    code: 'LEGENDARY_COLLECTOR',
    name: 'Legendary Collector',
    description: 'Pull 25 mythic/legendary cards',
    category: 'COLLECTION',
    icon: 'Diamond',
    rarity: 'EPIC',
    requirement: 25,
    coinReward: 1000,
    isSecret: false,
    sortOrder: 22,
  },
  {
    code: 'DIVERSE_COLLECTOR',
    name: 'Diverse Collector',
    description: 'Collect cards from 3 different games',
    category: 'COLLECTION',
    icon: 'Layers',
    rarity: 'UNCOMMON',
    requirement: 3,
    coinReward: 100,
    isSecret: false,
    sortOrder: 23,
  },
  {
    code: 'MASTER_COLLECTOR',
    name: 'Master Collector',
    description: 'Own 500 cards in your collection',
    category: 'COLLECTION',
    icon: 'Library',
    rarity: 'RARE',
    requirement: 500,
    coinReward: 500,
    isSecret: false,
    sortOrder: 24,
  },

  // ============================================
  // ECONOMY CATEGORY - Coins & Trading
  // ============================================
  {
    code: 'FIRST_SALE',
    name: 'First Sale',
    description: 'Sell your first card',
    category: 'ECONOMY',
    icon: 'Coins',
    rarity: 'COMMON',
    requirement: 1,
    coinReward: 10,
    isSecret: false,
    sortOrder: 30,
  },
  {
    code: 'MERCHANT',
    name: 'Merchant',
    description: 'Sell 50 cards',
    category: 'ECONOMY',
    icon: 'TrendingUp',
    rarity: 'UNCOMMON',
    requirement: 50,
    coinReward: 100,
    isSecret: false,
    sortOrder: 31,
  },
  {
    code: 'TRADE_MASTER',
    name: 'Trade Master',
    description: 'Sell 250 cards',
    category: 'ECONOMY',
    icon: 'BadgeDollarSign',
    rarity: 'RARE',
    requirement: 250,
    coinReward: 400,
    isSecret: false,
    sortOrder: 32,
  },
  {
    code: 'WEALTHY',
    name: 'Wealthy',
    description: 'Accumulate 10,000 coins total',
    category: 'ECONOMY',
    icon: 'Wallet',
    rarity: 'RARE',
    requirement: 10000,
    coinReward: 500,
    isSecret: false,
    sortOrder: 33,
  },
  {
    code: 'MILLIONAIRE',
    name: 'Millionaire',
    description: 'Accumulate 100,000 coins total',
    category: 'ECONOMY',
    icon: 'Banknote',
    rarity: 'LEGENDARY',
    requirement: 100000,
    coinReward: 5000,
    isSecret: false,
    sortOrder: 34,
  },

  // ============================================
  // SOCIAL CATEGORY - Community Achievements
  // ============================================
  {
    code: 'FIRST_ORDER',
    name: 'Real Cards!',
    description: 'Place your first order for physical cards',
    category: 'SOCIAL',
    icon: 'ShoppingBag',
    rarity: 'COMMON',
    requirement: 1,
    coinReward: 25,
    isSecret: false,
    sortOrder: 40,
  },
  {
    code: 'LOYAL_CUSTOMER',
    name: 'Loyal Customer',
    description: 'Place 10 orders',
    category: 'SOCIAL',
    icon: 'Heart',
    rarity: 'RARE',
    requirement: 10,
    coinReward: 300,
    isSecret: false,
    sortOrder: 41,
  },

  // ============================================
  // SPECIAL CATEGORY - Secret & Special
  // ============================================
  {
    code: 'LUCKY_SEVEN',
    name: 'Lucky Seven',
    description: 'Pull 7 rare+ cards in a single session',
    category: 'SPECIAL',
    icon: 'Clover',
    rarity: 'RARE',
    requirement: 7,
    coinReward: 777,
    isSecret: true,
    sortOrder: 50,
  },
  {
    code: 'NIGHT_OWL',
    name: 'Night Owl',
    description: 'Open packs between midnight and 4 AM',
    category: 'SPECIAL',
    icon: 'Moon',
    rarity: 'UNCOMMON',
    requirement: 1,
    coinReward: 50,
    isSecret: true,
    sortOrder: 51,
  },
  {
    code: 'EARLY_BIRD',
    name: 'Early Bird',
    description: 'Open packs between 5 AM and 7 AM',
    category: 'SPECIAL',
    icon: 'Sunrise',
    rarity: 'UNCOMMON',
    requirement: 1,
    coinReward: 50,
    isSecret: true,
    sortOrder: 52,
  },
  {
    code: 'JACKPOT_WINNER',
    name: 'Jackpot Winner',
    description: 'Win a Jackpot mode battle',
    category: 'SPECIAL',
    icon: 'CircleDollarSign',
    rarity: 'EPIC',
    requirement: 1,
    coinReward: 500,
    isSecret: false,
    sortOrder: 53,
  },
  {
    code: 'UNDERDOG',
    name: 'Underdog',
    description: 'Win a battle after being in last place',
    category: 'SPECIAL',
    icon: 'Rocket',
    rarity: 'EPIC',
    requirement: 1,
    coinReward: 250,
    isSecret: true,
    sortOrder: 54,
  },
];

// Helper functions
export function getAchievementByCode(code: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(a => a.code === code);
}

export function getAchievementsByCategory(category: AchievementDefinition['category']): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(a => a.category === category).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAchievementsByRarity(rarity: AchievementDefinition['rarity']): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(a => a.rarity === rarity).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Rarity configuration for styling
export const RARITY_CONFIG = {
  COMMON: {
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    gradient: 'from-gray-500 to-slate-500',
    glow: 'shadow-gray-500/20',
  },
  UNCOMMON: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    gradient: 'from-green-500 to-emerald-500',
    glow: 'shadow-green-500/20',
  },
  RARE: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'shadow-blue-500/20',
  },
  EPIC: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    gradient: 'from-purple-500 to-pink-500',
    glow: 'shadow-purple-500/20',
  },
  LEGENDARY: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
  },
};

// Category configuration for styling
export const CATEGORY_CONFIG = {
  PULLS: {
    label: 'Pack Opening',
    icon: 'Package',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  BATTLES: {
    label: 'Battles',
    icon: 'Swords',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  COLLECTION: {
    label: 'Collection',
    icon: 'Gem',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  ECONOMY: {
    label: 'Economy',
    icon: 'Coins',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  SOCIAL: {
    label: 'Community',
    icon: 'Users',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  SPECIAL: {
    label: 'Special',
    icon: 'Sparkles',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
};
