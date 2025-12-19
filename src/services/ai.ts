import axios from 'axios';
import { BaziResult, AIConfig, FullAnalysisResult, LifeDataPoint } from '../types';

const cleanJson = (text: string): string => {
  return text.replace(/```json\s*|\s*```/g, '').trim();
};

export const generateBaseReport = async (
  bazi: BaziResult,
  config: AIConfig
): Promise<FullAnalysisResult> => {
  // Generate a unique signature for this Bazi to use for caching
  const baziSignature = `${bazi.gender}-${bazi.birthDate}-${bazi.yearPillar}-${bazi.monthPillar}-${bazi.dayPillar}-${bazi.hourPillar}`;

  try {
    // Use local backend proxy
    const response = await axios.post(
      '/api/generate-report',
      {
        cardKey: config.cardKey,
        model: config.model,
        baziSignature, // Send signature for caching
        generationType: 'base',
        baziData: {
          gender: bazi.gender,
          birthDate: bazi.birthDate,
          yearPillar: bazi.yearPillar,
          monthPillar: bazi.monthPillar,
          dayPillar: bazi.dayPillar,
          hourPillar: bazi.hourPillar,
          startAge: bazi.startAge,
          firstDaYun: bazi.firstDaYun
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(cleanJson(content));
  } catch (error: any) {
    console.error('Base Report Generation Error:', error);
    const msg = error.response?.data?.error || error.message || '基础分析生成失败';
    throw new Error(msg);
  }
};

export const generateBatchData = async (
  bazi: BaziResult,
  config: AIConfig,
  startAge: number,
  endAge: number,
  startYear: number
): Promise<LifeDataPoint[]> => {
  try {
    // Use local backend proxy
    const response = await axios.post(
      '/api/generate-report',
      {
        cardKey: config.cardKey,
        model: config.model,
        generationType: 'batch',
        baziData: {
          gender: bazi.gender,
          yearPillar: bazi.yearPillar,
          monthPillar: bazi.monthPillar,
          dayPillar: bazi.dayPillar,
          hourPillar: bazi.hourPillar,
          currentAge: startAge,
          endAge: endAge,
          startYear: startYear
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const result = JSON.parse(cleanJson(content));
    return Array.isArray(result) ? result : result.chartData || [];
  } catch (error) {
    console.error(`Batch Generation Error (${startAge}-${endAge}):`, error);
    // 返回空数组而不是抛出错误，以免中断整个流程
    return [];
  }
};

// Deprecated: kept for compatibility if needed, but we will switch to the new flow
export const generateLifeAnalysis = async (
  bazi: BaziResult,
  config: AIConfig
): Promise<FullAnalysisResult> => {
    return generateBaseReport(bazi, config);
};
