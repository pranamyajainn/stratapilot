export interface Demographic {
  age: string; // "Age Group"
  gender: string;
  location: string;
  educationLevel: string;
  incomeLevel: string;
  occupation: string;
  maritalStatus: string;
  generation?: string; // e.g. Gen Z, Millennial
  householdStructure?: string; // e.g. Nuclear, Joint, Single
  techLiteracy?: 'Low' | 'Medium' | 'High';
}

export interface Psychographic {
  interestsAndHobbies: string[];
  valuesAndBeliefs: string[];
  lifestyleChoices: string[];
  personalityTraits: string[];
  brandArchetype?: string; // Kept as special highlight
  motivations: string[];
  goalsAndAspirations: string[];
  challengesAndPainPoints: string[];
}

export interface Behavioral {
  buyingHabits: string;
  productUsageFrequency: string;
  brandLoyalty: string;
  onlineBehavior: string;
  socialMediaPlatforms: string[]; // "Social Media Platforms Use"
  contentConsumption: string; // "Content Consumption Preferences"
  responseToMarketing: string; // "Response to Marketing Strategies"
  priceSensitivity?: 'Low' | 'Medium' | 'High';
  decisionDriver?: string; // e.g. Price, Quality, Status, Convenience
  purchaseJourney?: string; // e.g. Impulse, Research-Heavy, Referral
}

export interface DiagnosticItem {
  metric: string;
  score: number; // 0-100
  originalScore?: number; // For Human-in-the-loop tracking
  isOverridden?: boolean;
  benchmark: number; // 0-100 (Category Normative Score)
  rubricTier: string; // e.g. "Outstanding", "Excellent", "Average"
  subInsights: string[]; // 5 specific insight points
  commentary: string; // Mapped to THE ISSUE
  whyItMatters: string; // Mapped to WHY IT MATTERS
  recommendation: string; // Mapped to THE FIX
  impact: string; // Mapped to IMPACT
  isVerified?: boolean;
  isHumanEdited?: boolean;
}

export interface BrandAnalysis {
  consumerInsight: string;
  functionalBenefit: string;
  emotionalBenefit: string;
  brandPersonality: string;
  reasonsToBelieve: string[];
}

export interface BrandStrategyCard {
  title: string;
  subtitle: string;
  content: string;
}

export interface RoiMetrics {
  hookScore: number; // 0-100
  clarityScore: number; // 0-100
  emotionCurveEngagement: number; // %
  brandVisibilityScore: number; // 0-100 (First 5 sec)
  predictedDropOff: number; // % (First 3 sec)
  predictedVtr: number; // % (View Through Rate)
  predictedCtr: number; // % (Click Through Rate)
  roiUplift: number; // %
}

export interface BrandArchetypeDetail {
  archetype: string;
  value: string;
  quote: string;
  reasoning: string;
}

export interface ModelHealth {
  fairnessScore: number; // 0-100
  biasCheckPassed: boolean;
  driftStatus: 'Stable' | 'Drift Detected' | 'Retraining Needed';
  oodConfidence: number; // Out-of-distribution confidence
}

export interface ValidationMetrics {
  heldOutAccuracy: number; // Test 1
  oodDrop: number; // Test 2 (% drop)
  noiseStability: number; // Test 3 (%)
  hallucinationRate: number; // Test 4 (%)
  fairnessGap: number; // Test 5
  calibrationEce: number; // Test 6
  kpiCorrelation: number; // Test 7
  abLift: number; // Test 8 (%)
  driftPsi: number; // Test 9
  latencyP99: number; // Test 10 (ms)
}

export interface CampaignStrategy {
  keyPillars: string[];
  keyMessages: Array<{ headline: string; subMessage: string }>;
  channelSelection: string[];
  timeline: string;
  budgetAllocation: string;
  successMetrics: string[];
}

export interface AnalysisResult {
  auditId?: string; // Sequential ID (e.g., SP-00001)
  demographics: Demographic;
  psychographics: Psychographic;
  behavioral: Behavioral;
  adDiagnostics: DiagnosticItem[];
  brandAnalysis?: BrandAnalysis;
  brandStrategyWindow: BrandStrategyCard[];
  brandArchetypeDetail?: BrandArchetypeDetail;
  roiMetrics?: RoiMetrics;
  modelHealth?: ModelHealth;
  validationSuite?: ValidationMetrics;
  campaignStrategy?: CampaignStrategy;
}

export type LoadingState = 'idle' | 'analyzing' | 'strategizing' | 'success' | 'error';