
export const ageOptions = [
  "16-20", "21-25", "26-30", "31-35", 
  "36-40", "41-45", "46-50", "50+"
];

export const goalOptions = [
  { id: "get-drippy", title: "Get Drippy", description: "Elevate my style game", emoji: "🔥" },
  { id: "find-outfits", title: "Find Good Outfits", description: "Discover what looks good on me", emoji: "👔" },
  { id: "get-partner", title: "Trying to get a BF/GF", description: "Look attractive for dating", emoji: "💕" },
  { id: "drip-max", title: "Drip Max", description: "Become a style icon", emoji: "🏆" }
];

export const totalSteps = 9;

export const stepMap = {
  'welcome': 1,
  'age': 2,
  'goal': 3,
  'test-photo': 4,
  'rating': 5,
  'celebration': 6,
  'trial-offer': 7,
  'trial-reminder': 8,
  'pricing': 9,
  'paywall': 10
} as const;
