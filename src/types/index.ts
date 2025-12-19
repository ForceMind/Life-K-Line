export interface LifeEvent {
  title: string;
  description?: string;
}

export interface LifeDataPoint {
  year: number;      // 年份
  age: number;       // 年龄
  ganZhi?: string;   // 干支
  daYun?: string;    // 大运
  open: number;      // 年初状态 (0-100)
  close: number;     // 年末状态 (0-100)
  high: number;      // 年度高光时刻 (0-100)
  low: number;       // 年度低谷时刻 (0-100)
  events: LifeEvent[]; // 大事记
  summary?: string;    // 年度总结
}

export interface AnalysisDetail {
  bazi: string[];       // 八字 [年, 月, 日, 时]
  summary: string;      // 总体运势
  summaryScore: number;
  personality: string;  // 性格分析
  personalityScore: number;
  appearance: string;   // 外貌特征
  appearanceScore: number;
  industry: string;     // 事业发展
  industryScore: number;
  fengShui: string;     // 发展风水
  fengShuiScore: number;
  wealth: string;       // 财富等级
  wealthScore: number;
  marriage: string;     // 婚姻姻缘
  marriageScore: number;
  health: string;       // 身体健康
  healthScore: number;
  family: string;       // 六亲关系
  familyScore: number;
  totalScore: number;   // 人生总评
}

export interface FullAnalysisResult {
  chartData: LifeDataPoint[];
  analysis: AnalysisDetail;
}

export interface BaziResult {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  gender: 'male' | 'female';
  birthDate: string;
  startAge?: number;
  firstDaYun?: string;
}

export interface AIConfig {
  cardKey: string; // Changed from apiKey to cardKey
  baseUrl: string; // Now points to local server usually
  model: string;
}

export interface HistoryRecord {
  id: string; // Unique ID (baziSignature)
  timestamp: number;
  userInput: any;
  result: FullAnalysisResult;
  lastAgeGenerated: number; // To track progress for resuming
}
