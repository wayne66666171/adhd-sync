// 问题类型
export interface Question {
  id: number;
  category: string;
  question: string;
  desc?: string;
}

// 回答方向类型
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

// 回答记录
export type Responses = Record<number, SwipeDirection>;

// 影响程度
export type ImpactLevel = 'mild' | 'moderate' | 'severe' | 'verySevere';

export const impactLevels: Record<ImpactLevel, { text: string; value: number }> = {
  mild: { text: '轻微', value: 1 },
  moderate: { text: '中等', value: 2 },
  severe: { text: '严重', value: 3 },
  verySevere: { text: '极严重', value: 4 },
};

// 症状类型
export interface Symptom {
  name: string;
  category: string;
}

// 诊断结果
export interface Diagnosis {
  inattentiveScore: number;
  hyperactiveScore: number;
  durationMet: boolean;
  onsetMet: boolean;
  impairment: number;
  familyHistory: number;
  comorbidities: string[];
  exclusionsMet: boolean;
  subtype: string | null;
  confidence: number;
  report: string;
}

// 评估记录
export interface AssessmentRecord {
  id: number;
  date: string;
  symptoms: Symptom[];
  severity: number;
  summary: string;
  duration: string;
  diagnosis: Diagnosis;
  responses: Responses;
  extraNotes?: string;
  selectedProvince?: string;
}

// 持续时间选项
export interface Duration {
  id: string;
  text: string;
}

export const durations: Duration[] = [
  { id: 'oneMonth', text: '最近1个月' },
  { id: 'threeMonths', text: '最近3个月' },
  { id: 'sixMonthsPlus', text: '半年以上' },
];

// 猫的动画状态
export type CatGesture = '' | 'tilt-left' | 'tilt-right' | 'gesture-up' | 'gesture-down';
