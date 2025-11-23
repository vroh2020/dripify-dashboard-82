# Trendza App - Comprehensive Codebase Plan

## 📋 Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Onboarding Flow](#onboarding-flow)
4. [Dashboard/Closet Pages](#dashboardcloset-pages)
5. [Scan View](#scan-view)
6. [Profile Page](#profile-page)
7. [Routing & Navigation](#routing--navigation)
8. [State Management](#state-management)
9. [Database Schema](#database-schema)
10. [Key Features](#key-features)

---

## Application Overview

**Trendza** (branded as "OutfitGrader AI") is a fashion/style analysis mobile application built with React, TypeScript, and Capacitor for iOS/Android deployment. The app provides AI-powered outfit analysis, digital closet management, and style recommendations.

### Core Value Proposition
- **AI Style Analysis**: Users can upload photos of their outfits to receive personalized style scores and feedback
- **Digital Closet**: Users can build and manage their wardrobe digitally
- **Outfit Generation**: AI-powered outfit recommendations and styling
- **Style Tracking**: Track style scores over time with analytics

---

## Architecture & Tech Stack

### Frontend Framework
- **React 18.3.1** with TypeScript
- **Vite** as build tool
- **React Router DOM** for routing
- **Capacitor 6.x** for native iOS/Android deployment

### UI Libraries
- **Framer Motion** for animations
- **Radix UI** components (shadcn/ui pattern)
- **Tailwind CSS** for styling
- **Lucide React** for icons

### State Management
- **Zustand** for global state
- **React Query (@tanstack/react-query)** for server state
- **React Hooks** for local component state

### Backend Services
- **Supabase** for:
  - Authentication (anonymous auth)
  - Database (PostgreSQL)
  - Storage (image uploads)
  - Edge Functions (AI analysis)

### Subscription Management
- **RevenueCat** via `@revenuecat/purchases-capacitor` for in-app purchases

### AI/ML Services
- **Mistral AI** (via Nebius API) for style analysis
- Custom Supabase Edge Functions for image processing

---

## Onboarding Flow

### Overview
The onboarding flow is a **6-step wizard** that guides new users through:
1. Welcome & account creation
2. How it works explanation
3. Photo capture
4. Fake analysis (for demo purposes)
5. Teaser results (locked)
6. Paywall/subscription

### Flow Location
- **Entry Point**: `src/pages/Auth.tsx`
- **Main Component**: `AuthOnboardingWizard` component
- **Route**: `/auth`

### Step-by-Step Breakdown

#### Step 1: NewWelcomeStep (`NewWelcomeStep.tsx`)
**Purpose**: Initial welcome screen and anonymous user creation

**Features**:
- Branded welcome screen with "OutfitGrader AI" branding
- "Get Started" button
- Anonymous authentication via Supabase
- In-app review prompt (iOS/Android only)
- User creation callback to parent component

**Key Functions**:
- `handleAnonymousSign()`: Creates anonymous Supabase user
- `getCurrentUserId()`: Retrieves current user session
- `onUserCreated()`: Callback to set userId in parent state

**State Management**:
- Uses `localStorage` for step persistence (`onboarding_step`)
- Saves completion to `onboarding_v2` table
- Tracks actions in `user_analytics` table

---

#### Step 2: HowItWorksStep (`HowItWorksStep.tsx`)
**Purpose**: Explain the app's functionality

**Features**:
- Three-step explanation:
  1. "Scan your outfit" - Photo capture
  2. "Generate your style report" - AI analysis
  3. "Get your style plan" - Recommendations
- Back button to return to welcome
- Next button that auto-triggers camera capture

**User Flow**:
- User clicks "Next" → automatically opens camera (no separate photo selection screen)
- On web: File input with camera capture preference
- On native: Capacitor Camera API

---

#### Step 3: GetGradeStep (`GetGradeStep.tsx`)
**Purpose**: Manual photo capture fallback (if auto-capture fails)

**Features**:
- Photo upload interface
- Camera capture option
- File selection fallback
- Back button to return to "How It Works"

**Note**: This step is often skipped due to auto-capture in Step 2

---

#### Step 4: AnalyzingStep (`AnalyzingStep.tsx`)
**Purpose**: Show loading animation during analysis

**Features**:
- Animated loading screen
- Progress indicators
- Auto-completes after analysis finishes

**Technical Details**:
- Uses **fake analysis** (`performFakeAnalysis()`)
- Generates random scores (75-90 base range)
- No actual AI credits used
- Creates local image URL (no upload)
- Analysis data structure:
  ```typescript
  {
    overallScore: number (75-100),
    breakdown: [
      { category: 'Style', score: number, emoji: '', feedback: string },
      { category: 'Fit', score: number, emoji: '', feedback: string },
      { category: 'Color', score: number, emoji: '', feedback: string }
    ],
    tips: string[],
    summary: string
  }
  ```

**Data Persistence**:
- Saves to `analysis_results` table
- Saves onboarding step data to `onboarding_v2`
- Tracks action in `user_analytics`

---

#### Step 5: TeaserResultStep (`TeaserResultStep.tsx`)
**Purpose**: Show locked/preview results to entice subscription

**Features**:
- User's photo displayed
- Four locked feature cards:
  - Overall Score (locked)
  - Potential (locked)
  - Drip (locked)
  - Aura (locked)
- "Unlock ur style analysis →" CTA button
- Dark theme UI

**Purpose**: Creates desire before paywall

---

#### Step 6: ProOfferCard (`ProOfferCard.tsx`)
**Purpose**: Subscription paywall

**Features**:
- **Two subscription plans**:
  1. **Weekly Plan**: 3-day free trial, then $4.99/week
  2. **Monthly Plan**: $9.99/month (shown as "SAVE 50%")
- **Feature carousel**: Auto-scrolling images showcasing app features
- **Plan selection**: Radio button interface
- **CTA button**: "Start 3-Day Free Trial →" or "Unlock Premium Access →"
- **Restore purchases**: For existing subscribers
- **Legal links**: Privacy Policy and Terms of Use
- **RevenueCat integration**: Handles purchases

**Purchase Flow**:
1. User selects plan (weekly/monthly)
2. Clicks CTA button
3. RevenueCat processes purchase
4. On success: Sets `subscription_active` in localStorage
5. Sets `onboarding_completed` in localStorage
6. Navigates to `/dashboard`

**State Management**:
- Uses `SubscriptionProvider` context
- Checks `isPro` status
- Handles purchase errors with retry

---

### Onboarding Data Persistence

**Tables Used**:
1. **`onboarding_v2`**: Single row per user
   - `user_id`: UUID
   - `step`: Current step name
   - `step_data`: JSON object with all step data
   - `current_step`: String tracking current step
   - `completed`: Boolean
   - `completed_at`: Timestamp

2. **`user_analytics`**: Action tracking
   - `user_id`: UUID
   - `action`: String (e.g., "welcome_completed", "photo_uploaded")
   - `data`: JSON object
   - `timestamp`: Timestamp

3. **`analysis_results`**: Analysis data
   - `user_id`: UUID
   - `image_url`: String
   - `analysis_data`: JSON object
   - `score`: Number
   - `created_at`: Timestamp

### LocalStorage Keys
- `onboarding_step`: Current step number (1-6)
- `onboarding_completed`: "true" when completed
- `subscription_active`: "true" when subscribed
- `analysis_result`: JSON string of analysis data

---

## Dashboard/Closet Pages

### Overview
The main dashboard area consists of three interconnected views accessible via bottom navigation:
1. **Scan View** (`/scan`) - Style analysis
2. **Closet View** (`/closet`) - Digital wardrobe management

### Main Layout Component: `Index.tsx`

**Location**: `src/pages/Index.tsx`

**Structure**:
- **DashboardHeader**: Top header with Trendza branding and profile button
- **Tabs Component**: React Router-based tab switching
- **Content Area**: Conditionally renders based on route
- **Bottom Navigation**: Fixed bottom nav with 2 tabs (Scan, Closet)

**Navigation**:
- Uses React Router's `useLocation` and `useNavigate`
- Syncs tab state with URL path
- Handles navigation between `/scan`, `/closet`, `/profile`

**Bottom Navigation Tabs**:
1. **Scan** (Scan icon) - Navigates to `/scan`
2. **Closet** (Shirt icon) - Navigates to `/closet`

---

### Dashboard View (`DashboardView.tsx`)

**Location**: `src/components/DashboardView.tsx`
**Route**: Currently not directly accessible (would be `/dashboard`)

**Purpose**: Main dashboard showing user stats and recent activity

**Features**:
- **Welcome Header**: "Welcome back!" with greeting
- **Stats Grid** (2x2):
  - Average Score
  - Best Score
  - Day Streak
  - This Week activity count
- **Quick Actions**:
  - Style Scan → Navigate to `/scan`
  - My Closet → Navigate to `/closet`
- **Recent Scans**: List of last 3 style analyses with thumbnails

**Data Source**:
- Fetches from `style_analyses` table
- Calculates stats from analysis scores
- Shows empty state if no scans exist

**Empty State**:
- Large camera icon
- "Start Your Style Journey" message
- CTA button to take first scan

---

### Closet View (`ClosetView.tsx`)

**Location**: `src/components/closet/ClosetView.tsx`
**Route**: `/closet`

**Purpose**: Digital wardrobe management with outfit creation

**Structure**: Three-tab interface

#### Tab 1: Pieces Tab (`PiecesTab.tsx`)

**Purpose**: View and manage individual clothing items

**Features**:
- **Header**: "My Closet" with item count
- **Filter Chips**: Horizontal scrolling chips
  - All
  - Favorites (Heart icon)
  - Tops
  - Bottoms
  - Shoes
  - Accessories
- **Items Grid**: 3-column masonry grid
  - "Add Piece" card (first tile)
  - Item cards with images
  - Favorite toggle (heart icon)
- **Empty State**: Dashed border card with Plus icon

**Item Card Features**:
- Image display (with loading states)
- Favorite button overlay
- Click to view details modal
- Image caching for instant loading

**Filter Logic**:
- Category filters: Single selection (tops/bottoms/shoes/accessories)
- Favorites filter: Can combine with category filters
- "All" filter: Clears all filters

**Add Item Flow**:
1. Click "Add Piece" or camera button
2. Opens Capacitor Camera
3. Captures photo
4. Uploads to Supabase Storage (`style_images` bucket)
5. Calls AI analysis function (`analyze-closet-item` edge function)
6. Creates item in `trendza_closet_items` table
7. Updates local state

**Data Source**:
- `trendza_closet_items` table
- Filters by `user_id`
- Orders by `created_at DESC`

**Item Data Structure**:
```typescript
{
  id: string (UUID),
  title: string,
  brand?: string,
  category: 'tops' | 'bottoms' | 'shoes' | 'accessories',
  color: string,
  season?: string,
  tags: string[],
  attributes: Record<string, any>,
  source_image_url: string,
  created_at: timestamp,
  favorite?: boolean
}
```

---

#### Tab 2: Fits Tab (`FitsTab.tsx`)

**Purpose**: Create and visualize outfit combinations

**Features**:
- **Header**: 
  - Back button to Pieces tab
  - Shuffle button (randomizes outfit)
  - Save Fit button
- **Fit Display**: Vertical stack of items
  - Headwear (top)
  - Tops
  - Bottoms
  - Footwear (bottom)
- **Save Modal**: 
  - Text input for fit name
  - Cancel/Save buttons
  - Success feedback

**Fit Creation Logic**:
- Auto-initializes with first item from each category
- Shuffle randomly selects from available items
- Categories items automatically:
  - Headwear: Accessories with "hat"/"cap"/"beanie" in title
  - Tops: category === 'tops'
  - Bottoms: category === 'bottoms'
  - Footwear: category === 'shoes'

**Save Flow**:
1. User clicks "Save Fit"
2. Enter fit name
3. Validates UUIDs (removes temp IDs)
4. Saves to `trendza_outfits` table:
   ```typescript
   {
     user_id: UUID,
     name: string,
     item_ids: UUID[],
     score: number (70-100),
     rationale: string,
     created_at: timestamp
   }
   ```
5. Shows success feedback
6. Navigates to Collections tab

**UI Design**:
- Clean vertical stack layout
- Fixed-size item images (144x144px)
- Centered alignment
- Minimal styling

---

#### Tab 3: Collections Tab (`CollectionsTab.tsx`)

**Purpose**: View and manage saved outfits

**Features**:
- **Header**: "Collections" with outfit count
- **Go-To Looks Section**: First 6 outfits in 3-column grid
- **More Outfits Section**: Remaining outfits (if > 6)
- **Outfit Cards**:
  - Thumbnail preview (stacked items or main item)
  - Outfit name
  - Piece count
  - Score badge (if available)
  - Delete button (on hover)

**Outfit Display**:
- **Go-To Looks**: Shows up to 4 stacked thumbnails
- **More Outfits**: Single main item with count badge
- Click to view/edit outfit details

**Actions**:
- **Edit**: Click card → Shows full outfit view
- **Delete**: Hover → Trash icon → Delete from database

**Data Source**:
- `trendza_outfits` table
- Joins with `trendza_closet_items` to get item details
- Orders by `created_at DESC`

**Empty State**:
- "No saved outfits yet" message
- Instruction to create outfits in Fits tab

---

### Item Detail Modal (`ItemDetailModal.tsx`)

**Purpose**: Full-screen view of individual closet item

**Features**:
- Large image display
- Item metadata (title, brand, category, color, tags)
- Favorite toggle
- Close button
- Smooth animations

**Triggers**: Click on any item card in Pieces tab

---

### Closet Data Flow

**Loading**:
1. Component mounts
2. `loadData()` function called
3. Parallel queries:
   - `trendza_closet_items` (all items)
   - `trendza_outfits` (all outfits)
4. Normalizes data structure
5. Filters invalid items (no image, no title)
6. Updates local state

**Adding Items**:
1. Camera capture → File blob
2. Upload to Supabase Storage
3. Get public URL
4. Call AI analysis (optional)
5. Insert to database
6. Update local state

**Saving Outfits**:
1. User selects items in Fits tab
2. Clicks "Save Fit"
3. Validates item UUIDs
4. Inserts to `trendza_outfits`
5. Updates local state
6. Navigates to Collections

---

## Scan View

### Overview
**Location**: `src/components/ScanView.tsx`
**Route**: `/scan`

**Purpose**: Upload photo and get AI style analysis

### Features

#### Upload Interface
- **Header**: "Style Analysis" title
- **Upload Area**: 
  - Camera icon (when no image)
  - Selected image preview
  - "Select Photo" button
  - "Change Photo" option
- **Analyze Button**: 
  - Appears after image selection
  - Shows loading spinner during analysis
  - "Analyze Style" text with Sparkles icon

#### Results Display
- **Score Display**: Large circular badge with overall score (0-100)
- **Score Breakdown**: Category-wise scores
  - Style category
  - Fit category
  - Color category
  - Each with emoji, category name, and score
- **Style Tips**: List of improvement suggestions
  - Category label
  - Tip text
  - Sparkles icon

### Analysis Flow

1. **Image Selection**:
   - File input with `accept="image/*"`
   - Creates File object
   - Sets local state

2. **Analysis**:
   - Calls `analyzeStyle()` utility function
   - Uploads image to Supabase Storage
   - Calls AI analysis service
   - Parses response
   - Updates state with results

3. **Results Display**:
   - Shows score breakdown
   - Displays style tips
   - "New Scan" button to restart

### Data Persistence
- Analysis results saved to `style_analyses` table
- Image stored in Supabase Storage
- Score tracked in scan store (Zustand)

### Analysis Service
**Location**: `src/utils/imageAnalysis.ts`

**Function**: `analyzeStyle(imageFile: File, useAI: boolean)`

**Process**:
1. Upload image to storage
2. Get public URL
3. Call Supabase Edge Function or Mistral API
4. Parse AI response
5. Return structured analysis object

---

## Profile Page

### Overview
**Location**: `src/pages/Profile.tsx`
**Route**: `/profile`

**Purpose**: User profile management and account settings

### Features

#### Profile Header (`ProfileHeader.tsx`)
- **Avatar Display**: User's profile picture
- **Username**: Display name
- **Pro Badge**: Crown icon if Pro subscriber
- **Logout Button**: Sign out functionality

#### Profile Stats (`ProfileStats.tsx`)
- **Total Scans**: Count of style analyses
- **Average Score**: Mean of all scores
- **Best Score**: Highest score achieved
- **Streak**: Consecutive days with scans

**Data Source**: `useStatsStore()` hook

#### Avatar Upload (`AvatarUpload.tsx`)
- **Image Upload**: Camera icon button
- **Preview**: Shows current avatar
- **Update**: Uploads to Supabase Storage
- **Database**: Updates `profiles.avatar_url`

#### Account Deletion
- **DeleteAccountButton**: Red danger zone
- **Confirmation**: Requires user confirmation
- **Data Cleanup**: Deletes all user data
- **Auth Cleanup**: Removes Supabase auth user

### Profile Data Structure

**Table**: `profiles`
```typescript
{
  id: UUID (matches auth.users.id),
  username: string,
  avatar_url: string | null,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Profile Actions

1. **Update Avatar**:
   - Select image
   - Upload to storage
   - Update database record
   - Refresh UI

2. **Update Username**:
   - Edit name field
   - Save to database

3. **Logout**:
   - Signs out from Supabase
   - Clears localStorage
   - Navigates to `/auth`

4. **Delete Account**:
   - Confirmation modal
   - Deletes all user data:
     - `profiles`
     - `trendza_closet_items`
     - `trendza_outfits`
     - `style_analyses`
     - `onboarding_v2`
     - `user_analytics`
   - Deletes auth user
   - Signs out

---

## Routing & Navigation

### Router Configuration
**Location**: `src/App.tsx`

**Routes**:
```typescript
/auth          → Auth (Onboarding)
/scan          → Index (ScanView)
/closet        → Index (ClosetView)
/profile       → Profile
/              → Redirects to /scan
/*             → Redirects to /scan or /auth
```

### Route Guard Logic

**Simple LocalStorage-based guards**:
```typescript
const hasCompletedOnboarding = localStorage.getItem('onboarding_completed') === 'true';
const hasPaid = localStorage.getItem('subscription_active') === 'true';
const shouldShowDashboard = hasCompletedOnboarding && hasPaid;
```

**Flow**:
- If `shouldShowDashboard` → Show dashboard routes
- Else → Redirect to `/auth` (onboarding)

### Navigation Components

1. **DashboardHeader**: 
   - Trendza logo (T icon)
   - Profile button (navigates to `/profile`)

2. **Bottom Navigation**:
   - Fixed position
   - 2 tabs: Scan, Closet
   - Active state styling
   - Smooth transitions

3. **Tab Switching**:
   - Synced with URL
   - Uses React Router navigation
   - Preserves scroll position

---

## State Management

### Global State (Zustand)

#### 1. Scan Store (`store/scanStore.ts`)
```typescript
{
  scans: Scan[],
  addScan: (scan: Scan) => void,
  clearScans: () => void
}
```

#### 2. Stats Store (`store/statsStore.ts`)
```typescript
{
  stats: UserStats,
  isLoading: boolean,
  error: string | null,
  fetchUserStats: (userId: string) => Promise<void>
}
```

#### 3. Subscription Store (`store/subscriptionStore.ts`)
```typescript
{
  isPro: boolean,
  isLoading: boolean,
  offerings: Offering[],
  checkSubscription: () => Promise<void>
}
```

### Context Providers

#### 1. AuthProvider (`providers/AuthProvider.tsx`)
- Manages authentication state
- Provides `user`, `loading`, `signOut` methods
- Handles session refresh

#### 2. SubscriptionProvider (`components/subscription/SubscriptionProvider.tsx`)
- Manages RevenueCat integration
- Provides `isPro`, `offerings`, `purchaseProduct`, `restorePurchases`
- Syncs with RevenueCat SDK

#### 3. OnboardingProvider (`providers/OnboardingProvider.tsx`)
- Tracks onboarding progress
- Manages step state
- Persists to database

### React Query

**Configuration** (`App.tsx`):
```typescript
{
  retry: 1,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000 // 5 minutes
}
```

**Used For**:
- API data fetching
- Cache management
- Background refetching

---

## Database Schema

### Supabase Tables

#### 1. `profiles`
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
username TEXT
avatar_url TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### 2. `onboarding_v2`
```sql
user_id UUID PRIMARY KEY REFERENCES auth.users(id)
step TEXT
step_data JSONB
current_step TEXT
completed BOOLEAN
completed_at TIMESTAMP
updated_at TIMESTAMP
```

#### 3. `trendza_closet_items`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
title TEXT
brand TEXT
category TEXT -- 'tops', 'bottoms', 'shoes', 'accessories'
color TEXT
season TEXT
tags TEXT[]
attributes JSONB
source_image_url TEXT
created_at TIMESTAMP
```

#### 4. `trendza_outfits`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
name TEXT
item_ids UUID[] -- Array of closet item IDs
score INTEGER
rationale TEXT
created_at TIMESTAMP
```

#### 5. `style_analyses`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
image_url TEXT
thumbnail_url TEXT
total_score INTEGER
breakdown JSONB
tips JSONB
raw_analysis TEXT
streak_count INTEGER
created_at TIMESTAMP
```

#### 6. `analysis_results`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
image_url TEXT
analysis_data JSONB
score INTEGER
created_at TIMESTAMP
```

#### 7. `user_analytics`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
action TEXT
data JSONB
timestamp TIMESTAMP
```

### Storage Buckets

#### `style_images`
- **Purpose**: Store user-uploaded images
- **Path Structure**: `closet/{user_id}/{timestamp}_no_bg.png`
- **Access**: Public URLs
- **Policies**: User can only access own images

---

## Key Features

### 1. Anonymous Authentication
- No email/password required
- Supabase anonymous auth
- Automatic user creation
- Session persistence

### 2. AI Style Analysis
- Photo upload and analysis
- Score breakdown (Style, Fit, Color)
- Personalized tips
- Score tracking over time

### 3. Digital Closet
- Camera-based item capture
- AI-powered categorization
- Automatic tagging
- Category filtering
- Favorites system

### 4. Outfit Generation
- Visual outfit builder
- Random shuffle feature
- Save outfits to collections
- Outfit scoring

### 5. Subscription Management
- RevenueCat integration
- Weekly/Monthly plans
- Free trial (3 days)
- Restore purchases
- Pro badge display

### 6. Analytics & Tracking
- User action tracking
- Onboarding step tracking
- Score statistics
- Streak counting

### 7. Image Management
- Supabase Storage integration
- Automatic image optimization
- Caching for performance
- Background removal (planned)

### 8. Responsive Design
- Mobile-first approach
- Safe area handling (iOS)
- Touch-friendly UI
- Smooth animations

---

## Component Architecture

### Directory Structure
```
src/
├── components/
│   ├── onboarding/          # Onboarding flow components
│   │   ├── steps/           # Individual step components
│   │   ├── ProOfferCard.tsx # Paywall
│   │   └── types.ts         # Type definitions
│   ├── closet/              # Closet management
│   │   ├── ClosetView.tsx   # Main container
│   │   ├── PiecesTab.tsx    # Items grid
│   │   ├── FitsTab.tsx      # Outfit builder
│   │   └── CollectionsTab.tsx # Saved outfits
│   ├── dashboard/           # Dashboard components
│   ├── profile/             # Profile components
│   ├── ui/                  # Reusable UI components (shadcn)
│   └── subscription/       # Subscription management
├── pages/
│   ├── Auth.tsx             # Onboarding entry
│   ├── Index.tsx            # Main dashboard
│   └── Profile.tsx          # Profile page
├── hooks/                   # Custom hooks
├── store/                   # Zustand stores
├── providers/               # Context providers
├── utils/                   # Utility functions
├── services/                # API services
└── types/                   # TypeScript types
```

---

## Authentication Flow

### Anonymous Sign-In
1. User clicks "Get Started"
2. `handleAnonymousSign()` called
3. Supabase creates anonymous user
4. Session stored in localStorage
5. User ID returned to parent component
6. Onboarding continues

### Session Management
- **Storage**: Supabase auth session
- **Refresh**: Automatic via Supabase SDK
- **Logout**: Clears session and localStorage
- **Persistence**: Survives app restarts

---

## API Integration

### Supabase Client
**Location**: `src/integrations/supabase/client.ts`

**Functions**:
- `supabase.auth.*` - Authentication
- `supabase.from(table)` - Database queries
- `supabase.storage.*` - File storage
- `supabase.functions.invoke()` - Edge functions

### Edge Functions

#### `analyze-closet-item`
- **Purpose**: AI analysis of closet items
- **Input**: Image data URL
- **Output**: Item metadata (category, color, tags, etc.)
- **Model**: Mistral AI via Nebius API

#### `analyze-style` (planned)
- **Purpose**: Full style analysis
- **Input**: User outfit photo
- **Output**: Complete style report

---

## Performance Optimizations

### 1. Image Caching
- Global image cache (`Map<string, HTMLImageElement>`)
- Preloading on component mount
- Instant loading from cache

### 2. Lazy Loading
- Route-based code splitting
- Suspense boundaries
- Dynamic imports

### 3. State Optimization
- Memoized calculations
- Selective re-renders
- Zustand selectors

### 4. Database Queries
- Parallel queries where possible
- Indexed fields for filtering
- Limit queries to necessary data

---

## Error Handling

### Error Boundaries
- `AuthErrorBoundary` wraps app
- Catches React errors
- Shows user-friendly messages

### Error Utilities
- `handleError()` function
- Logger utility (`Logger.info/warn/error`)
- Toast notifications for user feedback

---

## Testing Considerations

### Current State
- No formal test suite
- Manual testing only
- Console logging for debugging

### Recommended Additions
- Unit tests for utilities
- Integration tests for onboarding
- E2E tests for critical flows
- Visual regression tests

---

## Deployment

### Build Configuration
- **Vite** build system
- **Capacitor** for native builds
- **iOS**: Xcode project generation
- **Android**: Gradle build

### Environment Variables
- Supabase URL and keys
- RevenueCat API key
- Nebius API credentials

### Build Targets
- **Web**: Static site generation
- **iOS**: App Store via Xcode
- **Android**: Google Play via Gradle

---

## Future Enhancements

### Planned Features
1. **Real AI Analysis**: Replace fake analysis with real Mistral AI
2. **Social Features**: Share outfits, follow users
3. **Style Recommendations**: AI-powered outfit suggestions
4. **Weather Integration**: Outfit suggestions based on weather
5. **Shopping Integration**: Links to purchase items
6. **Advanced Analytics**: Detailed style insights
7. **Background Removal**: Automatic item background removal
8. **Outfit Calendar**: Plan outfits for specific dates

### Technical Improvements
1. **Offline Support**: PWA capabilities
2. **Push Notifications**: Reminders and updates
3. **Advanced Filtering**: More filter options
4. **Search Functionality**: Search closet items
5. **Export Data**: Download closet data
6. **Multi-language**: Internationalization
7. **Dark Mode**: Theme switching (planned)

---

## Conclusion

This codebase represents a comprehensive fashion/style analysis application with:
- **Streamlined onboarding** with anonymous auth
- **Digital closet management** with AI categorization
- **Style analysis** with scoring and feedback
- **Outfit generation** and collection management
- **Subscription monetization** via RevenueCat

The architecture is modern, scalable, and follows React best practices with proper separation of concerns, type safety, and performance optimizations.

---

**Last Updated**: Generated from codebase analysis
**Version**: 1.80.0

