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

export const onboardingSteps = [
  {
    id: 'welcome',
    type: 'info',
    question: 'Welcome to Dripify AI',
    button: 'Let\'s get started',
  },
  {
    id: 'heard-about',
    type: 'select',
    question: 'Where did you hear about Dripify AI?',
    options: [
      'Instagram', 'Facebook', 'TikTok', 'Youtube', 'Google', 'TV', 'Friend or family'
    ],
  },
  {
    id: 'age-range',
    type: 'select',
    question: 'What\'s your age range?',
    options: [
      'Under 18', '18–24', '25–34', '35–44', '45+'
    ],
  },
  {
    id: 'gender',
    type: 'select',
    question: 'What\'s your gender identity?',
    options: [
      'Male', 'Female', 'Non-binary', 'Prefer not to say'
    ],
  },
  {
    id: 'style-goal',
    type: 'select',
    question: 'What\'s your primary style goal?',
    options: [
      'Be more fashionable', 'Save time', 'Discover new outfits', 'Other'
    ],
  },
  {
    id: 'category',
    type: 'select',
    question: 'Which clothing category fits you best?',
    options: [
      'Casual', 'Business', 'Streetwear', 'Active', 'Formal'
    ],
  },
  {
    id: 'budget',
    type: 'select',
    question: 'What\'s your monthly fashion budget?',
    options: [
      '<$100', '$100–$250', '$250–$500', '$500+'
    ],
  },
  {
    id: 'brands',
    type: 'input',
    question: 'Name your top 3 favorite brands.',
    placeholder: 'e.g. Nike, Zara, Uniqlo',
  },
  {
    id: 'color-vibe',
    type: 'select',
    question: 'Do you prefer vibrant or neutral colors?',
    options: [
      'Vibrant', 'Neutral', 'Both'
    ],
  },
  {
    id: 'occasions',
    type: 'select',
    question: 'Which occasions do you dress for most?',
    options: [
      'Work', 'Date Night', 'Travel', 'Gym', 'Other'
    ],
  },
  {
    id: 'selfie',
    type: 'photo',
    question: 'Upload a quick selfie (optional)',
    optional: true,
  },
  {
    id: 'weekly-reports',
    type: 'select',
    question: 'Would you like weekly AI style reports?',
    options: [
      'Yes', 'No'
    ],
  },
  {
    id: 'instant-suggestions',
    type: 'select',
    question: 'Would you like instant AI outfit suggestions?',
    options: [
      'Yes', 'No'
    ],
  },
  {
    id: 'palette',
    type: 'select',
    question: 'What\'s your favorite color palette?',
    options: [
      'Earth Tones', 'Monochrome', 'Pastels', 'Bold'
    ],
  },
  {
    id: 'shop-frequency',
    type: 'select',
    question: 'How often do you shop for clothes?',
    options: [
      'Weekly', 'Monthly', 'Quarterly', 'Rarely'
    ],
  },
  {
    id: 'final-confirm',
    type: 'info',
    question: 'Ready to get styled by AI?',
    button: 'Next',
  },
  {
    id: 'account-choice',
    type: 'account',
    question: 'Save your progress?',
    options: ['Sign In with Apple', 'Continue as Guest'],
  },
  {
    id: 'paywall',
    type: 'paywall',
    question: 'Unlock unlimited outfit analyses, personalized style reports, early-access trends, cancel anytime.',
  },
];
