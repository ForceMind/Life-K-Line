<script setup lang="ts">
import { ref, reactive } from 'vue';
import InputForm from './components/InputForm.vue';
import AnalysisReport from './components/AnalysisReport.vue';
import { FullAnalysisResult, AIConfig, BaziResult } from './types';
import { calculateBazi } from './utils/bazi';
import { generateBaseReport, generateBatchData } from './services/ai';

const currentStep = ref<'input' | 'loading' | 'result'>('input');
const analysisResult = ref<FullAnalysisResult | null>(null);
const errorMsg = ref('');
const isGenerating = ref(false);

// API 配置
const apiConfig = reactive<AIConfig>({
  cardKey: '',
  baseUrl: '', // Not used for local proxy
  model: 'deepseek-chat'
});

const handleConfigUpdate = (config: AIConfig) => {
  Object.assign(apiConfig, config);
};

const startBatchGeneration = async (bazi: BaziResult, birthYear: number) => {
  const batchSize = 5;
  const maxAge = 80;
  let currentAge = 5; // 0-4岁已在基础报告中生成

  while (currentAge < maxAge && isGenerating.value) {
    // 等待10秒
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    if (!isGenerating.value) break;

    const endAge = Math.min(currentAge + batchSize - 1, maxAge);
    const startYear = birthYear + currentAge;
    
    try {
      const newPoints = await generateBatchData(bazi, apiConfig, currentAge, endAge, startYear);
      
      if (analysisResult.value && newPoints.length > 0) {
        // 追加数据，Vue 的响应式系统会自动更新图表
        analysisResult.value.chartData.push(...newPoints);
      }
    } catch (e) {
      console.error(`Batch generation failed for age ${currentAge}-${endAge}`, e);
    }
    
    currentAge += batchSize;
  }
  isGenerating.value = false;
};

const handleStart = async (userInput: any) => {
  if (!apiConfig.cardKey) {
    alert('请先点击底部按钮输入卡密');
    return;
  }

  currentStep.value = 'loading';
  errorMsg.value = '';
  isGenerating.value = true;

  try {
    // 1. 计算八字
    const bazi: BaziResult = calculateBazi(
      userInput.year,
      userInput.month,
      userInput.day,
      userInput.hour,
      userInput.minute,
      userInput.gender
    );

    // 2. 调用 AI 生成基础报告 (包含前5年数据)
    const result = await generateBaseReport(bazi, apiConfig);
    analysisResult.value = result;
    currentStep.value = 'result';

    // 3. 开始后台分批生成剩余数据
    startBatchGeneration(bazi, userInput.year);

  } catch (err: any) {
    errorMsg.value = err.message || '发生未知错误';
    currentStep.value = 'input';
    isGenerating.value = false;
    alert(errorMsg.value);
  }
};

const handleBack = () => {
  isGenerating.value = false; // 停止生成循环
  currentStep.value = 'input';
  analysisResult.value = null;
};
</script>

<template>
  <div class="font-sans">
    <!-- Loading State -->
    <div v-if="currentStep === 'loading'" class="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center text-gray-900">
      <div class="relative w-24 h-24 mb-8">
        <div class="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
        <div class="absolute inset-0 border-4 border-t-red-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center text-2xl text-gray-800">☯</div>
      </div>
      <h2 class="text-2xl font-bold mb-2 text-gray-900">天机推演中...</h2>
      <p class="text-gray-500 text-sm animate-pulse">正在排盘八字 / 分析大运流年 / 量化人生数据</p>
    </div>

    <!-- Input Form -->
    <InputForm 
      v-if="currentStep === 'input'" 
      @start="handleStart" 
      @update-config="handleConfigUpdate"
    />

    <!-- Analysis Report -->
    <AnalysisReport 
      v-if="currentStep === 'result' && analysisResult" 
      :result="analysisResult" 
      @back="handleBack"
    />
  </div>
</template>
