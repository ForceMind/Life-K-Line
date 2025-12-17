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
你是一位精通八字命理和数据可视化的专家，尤其擅长盲派命理技巧。请根据以下用户的八字信息，进行深入的命理分析，并生成前5年（0-4岁）的运势数据。

**用户信息：**
- 性别：${bazi.gender === 'male' ? '男' : '女'}
- 出生日期：${bazi.birthDate}
- 八字：${bazi.yearPillar} ${bazi.monthPillar} ${bazi.dayPillar} ${bazi.hourPillar}
- 起运：${bazi.startAge}岁, 首运：${bazi.firstDaYun}

**任务要求：**
1. **盲派技巧分析**：请运用盲派技巧（如做功、象法、废兴等）逐步分析八字。
2. **一生运势概览**：分析我的一生运势，涵盖事业、财富、婚姻、健康等各方面。
3. **具体细节**：尽可能详细具体，指出关键的时间节点和可能发生的事件。
4. **重点关注**：着重分析大运能赚多少钱，以及健康和婚姻状况。
5. **诚实评价**：判断出准确的关系模型后输出最终结果，诚实一点评价，用语不用太温和，直击要害。
6. **输出格式**：请返回一个标准的 JSON 对象，包含 \`analysis\` (命理分析) 和 \`chartData\` (0-4岁的K线数据) 两个部分。不要包含任何 Markdown 标记。

**JSON 结构定义：**
{
  "analysis": {
    "bazi": ["${bazi.yearPillar}", "${bazi.monthPillar}", "${bazi.dayPillar}", "${bazi.hourPillar}"],
    "summary": "总体运势简述 (100字左右，直击要害)",
    "summaryScore": 85, // 0-100
    "personality": "性格分析 (100字左右，盲派视角)",
    "personalityScore": 80,
    "appearance": "外貌特征分析 (50字以内)",
    "appearanceScore": 75,
    "industry": "适合的事业方向 (100字左右，具体行业)",
    "industryScore": 80,
    "fengShui": "发展风水建议 (50字以内)",
    "fengShuiScore": 70,
    "wealth": "财富等级分析 (100字左右，预估大运财运)",
    "wealthScore": 85,
    "marriage": "婚姻姻缘分析 (100字左右，配偶特征与婚姻质量)",
    "marriageScore": 75,
    "health": "身体健康分析 (100字左右，易患疾病与节点)",
    "healthScore": 80,
    "family": "六亲关系分析 (50字以内)",
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
1. **盲派流年推断**：结合大运和流年，运用盲派技巧推断每年的吉凶祸福。
2. **具体事件**：指出具体的事件（如发财、升职、结婚、生子、生病、灾祸等），不要模棱两可。
3. **诚实评价**：用语不用太温和，好就是好，坏就是坏。
4. **输出格式**：只返回一个 JSON 数组，包含 ${startAge}岁 到 ${endAge}岁 的 K线数据。不要包含任何 Markdown 标记。

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
