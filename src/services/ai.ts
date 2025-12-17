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

  const prompt = `
你是一位精通八字命理和数据可视化的专家。请根据以下用户的八字信息，进行初步的命理分析，并生成前5年（0-4岁）的运势数据。

**用户信息：**
- 性别：${bazi.gender === 'male' ? '男' : '女'}
- 出生日期：${bazi.birthDate}
- 八字：${bazi.yearPillar} ${bazi.monthPillar} ${bazi.dayPillar} ${bazi.hourPillar}
- 起运：${bazi.startAge}岁, 首运：${bazi.firstDaYun}

**任务要求：**
请返回一个标准的 JSON 对象，包含 \`analysis\` (命理分析) 和 \`chartData\` (0-4岁的K线数据) 两个部分。
不要包含任何 Markdown 标记。

**JSON 结构定义：**
{
  "analysis": {
    "bazi": ["${bazi.yearPillar}", "${bazi.monthPillar}", "${bazi.dayPillar}", "${bazi.hourPillar}"],
    "summary": "总体运势简述 (50字以内)",
    "summaryScore": 85, // 0-100
    "personality": "性格分析 (50字以内)",
    "personalityScore": 80,
    "appearance": "外貌特征分析 (30字以内)",
    "appearanceScore": 75,
    "industry": "适合的事业方向 (50字以内)",
    "industryScore": 80,
    "fengShui": "发展风水建议 (30字以内)",
    "fengShuiScore": 70,
    "wealth": "财富等级分析 (30字以内)",
    "wealthScore": 85,
    "marriage": "婚姻姻缘分析 (30字以内)",
    "marriageScore": 75,
    "health": "身体健康分析 (30字以内)",
    "healthScore": 80,
    "family": "六亲关系分析 (30字以内)",
    "familyScore": 75,
    "totalScore": 82 // 人生总评 0-100
  },
  "chartData": [
    // 0岁到4岁的数组 (共5年)
    {
      "year": 1995,
      "age": 0,
      "ganZhi": "乙亥",
      "open": 50,
      "close": 55,
      "high": 60,
      "low": 45,
      "summary": "出生之年",
      "events": [{"title": "出生", "description": "降生"}]
    }
  ]
}
`;

  try {
    // Use local backend proxy
    const response = await axios.post(
      '/api/generate-report',
      {
        cardKey: config.cardKey,
        model: config.model,
        baziSignature, // Send signature for caching
        messages: [
          { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
          { role: 'user', content: prompt }
        ]
      }
    );

    return JSON.parse(cleanJson(response.data.choices[0].message.content));
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
  const prompt = `
基于之前的八字分析（${bazi.gender === 'male' ? '男' : '女'}，八字：${bazi.yearPillar} ${bazi.monthPillar} ${bazi.dayPillar} ${bazi.hourPillar}），
请继续推演 ${startAge}岁 到 ${endAge}岁 的运势数据。

**任务要求：**
只返回一个 JSON 数组，包含 ${startAge}岁 到 ${endAge}岁 的 K线数据。
不要包含任何 Markdown 标记。

**JSON 数组结构示例：**
[
  {
    "year": ${startYear}, // 对应 ${startAge}岁
    "age": ${startAge},
    "ganZhi": "...",
    "open": 60,
    "close": 65,
    "high": 70,
    "low": 55,
    "summary": "...",
    "events": []
  }
  // ... 直到 ${endAge}岁
]
`;

  try {
    // Use local backend proxy
    const response = await axios.post(
      '/api/generate-report',
      {
        cardKey: config.cardKey,
        model: config.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
          { role: 'user', content: prompt }
        ]
      }
    );

    const result = JSON.parse(cleanJson(response.data.choices[0].message.content));
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
