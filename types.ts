
export enum UserRole {
  FREE = 'free',
  PRO = 'pro',
  PRO_MASTER = 'pro_master',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
  COACH = 'coach',
  CLIENT = 'client'
}

export interface BiometricData {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance';
  activityLevel: 'sedentary' | 'moderate' | 'active' | 'athlete';
  dietType?: 'balanced' | 'keto' | 'vegan' | 'vegetarian' | 'paleo';
  allergies?: string[];
  exclusions?: string[];
  medicalConditions?: string; // New
  medications?: string;       // New
  sleepHours?: number;        // New
  stressLevel?: string;       // New
  waterIntake?: number;       // New
  dailyMeals?: number;        // New
  injuries?: string;          // New
}

export interface UserMessage {
  id: string;
  from: string;
  senderId?: string; // ID of the sender (Coach/Admin)
  receiverId?: string; // ID of the receiver (Client)
  text: string;
  timestamp: string;
  read: boolean;
  type?: 'chat' | 'system'; // New field for categorization
}

export interface CalculatedMetrics {
  bmi: number;
  bmr: number;
  tdee: number;
  bodyFat: number;
  status: string;
}

export interface User {
  id: string;
  name: string;
  surname?: string; // Optional initially
  email: string;
  role: UserRole;
  tokens: number;
  lifetimeTokens?: number;
  avatar?: string; // Base64 or URL
  dateOfBirth?: string; // ISO Date YYYY-MM-DD
  biometrics: BiometricData;
  metrics?: CalculatedMetrics;
  joinedAt: string;
  lastLogin: string;
  messages: UserMessage[];
  password?: string; // For simulation purposes only
  planType?: 'free' | 'pro' | 'pro_master'; // New field for plan
  tokenResetDate?: string; // ISO Date for last reset
  coachId?: string; // Links client to a coach
  coachName?: string; // Fetched from backend
  coachProfile?: CoachProfile; // If user is a coach
  status?: 'active' | 'inactive';
  currentPeriodEnd?: string; // ISO Date String
  coachTier?: 'vip' | 'vip_plus'; // Frontend camelCase
  coach_tier?: 'vip' | 'vip_plus'; // Backend snake_case fallback
  pendingPlan?: 'pro' | 'pro_master' | null; // Pending activation
  subscriptionDate?: string; // Date when paid plan is activated
  // tokenResetDate already exists at line 65
}

export interface CoachProfile {
  planTier: 'vip' | 'vip_plus';
  commissionRate: number;
  subscriptionStatus: 'active' | 'past_due' | 'cancelled';
  stripeConnectId?: string;
}

export interface CommunityComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  type: 'achievement' | 'milestone' | 'motivation' | 'workout' | 'hydration' | 'presentation' | 'progress';
  timestamp: string;
  likes: number;
  tokensAwarded: number;
  status: 'pending' | 'published' | 'rejected' | 'needs_edit';
  comments?: CommunityComment[]; // New field
  isLiked?: boolean; // New field for current user state
  imageUrl?: string | null; // New field for images
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface FoodAnalysis {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  suggestions: string[];
  analysisText?: string; // Nuevo campo para el texto conversacional
}

export interface LoggedMeal extends FoodAnalysis {
  id: string;
  date: string; // ISO string
  timestamp: number;
  image?: string; // base64
}

// Define BodyMeasurements interface to fix 'Module has no exported member' error in Progress.tsx
export interface BodyMeasurements {
  weight: number;
  waist?: number;
  chest?: number;
  hips?: number;
  neck?: number;
}

export interface ProgressLog {
  date: string;
  weight: number;
  caloriesConsumed: number;
  measurements?: BodyMeasurements;
}

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  image?: string;
  ingredients: string[];
}

export interface DayPlan {
  day: string; // 'Monday', 'Tuesday', etc.
  meals: Meal[];
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  startDate: string;
  days: DayPlan[];
  metadata?: {
    targetCalories: number;
    currentWeight: number;
    goal: string;
    favoriteFoods: string[];
    createdAt: number;
    // Client specific data for Coach generated plans
    clientName?: string;
    clientAge?: number;
    clientGender?: string;
    clientActivityLevel?: string;
    clientHeight?: number;
    macroDistribution?: { p: number, c: number, f: number };
  };
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
  category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'other';
}
