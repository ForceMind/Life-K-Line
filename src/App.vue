<script setup lang="ts">
import { ref, reactive } from 'vue';
import InputForm from './components/InputForm.vue';
import AnalysisReport from './components/AnalysisReport.vue';
import { FullAnalysisResult, AIConfig, BaziResult, HistoryRecord } from './types';
import { calculateBazi } from './utils/bazi';
import { generateBaseReport, generateBatchData } from './services/ai';
import { saveRecord, getRecordById } from './services/history';

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

// Helper to generate signature for cache key
const generateSignature = (bazi: BaziResult) => {
  return `${bazi.gender}-${bazi.birthDate}-${bazi.yearPillar}-${bazi.monthPillar}-${bazi.dayPillar}-${bazi.hourPillar}`;
};

const startBatchGeneration = async (
  bazi: BaziResult, 
  birthYear: number, 
  startAgeFrom: number = 5,
  initialUserInput: any
) => {
  const batchSize = 5;
  const maxAge = 80;
  let currentAge = startAgeFrom;

  // Ensure we have a valid result object to update
  if (!analysisResult.value) return;

  const signature = generateSignature(bazi);

  while (currentAge < maxAge && isGenerating.value) {
    // Wait only if we are generating fresh data
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    if (!isGenerating.value) break;

    const endAge = Math.min(currentAge + batchSize - 1, maxAge);
    const startYear = birthYear + currentAge;
    
    try {
      const newPoints = await generateBatchData(bazi, apiConfig, currentAge, endAge, startYear);
      
      if (analysisResult.value && newPoints.length > 0) {
        // Append new data
        analysisResult.value.chartData.push(...newPoints);
        
        // Save progress to history
        saveRecord(
          signature,
          initialUserInput,
          analysisResult.value,
          endAge
        );
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
    // 1. Calculate Bazi
    const bazi: BaziResult = calculateBazi(
      userInput.year,
      userInput.month,
      userInput.day,
      userInput.hour,
      userInput.minute,
      userInput.gender
    );
    
    const signature = generateSignature(bazi);

    // 2. Check Local History Cache First
    const cachedRecord = getRecordById(signature);
    let startAgeForBatch = 5;

    if (cachedRecord) {
      console.log('Using cached record:', signature);
      analysisResult.value = cachedRecord.result;
      currentStep.value = 'result';
      
      // If the cached record is incomplete (less than max age approx 80), resume generation
      // The last point in chartData tells us where we left off
      const lastPoint = cachedRecord.result.chartData[cachedRecord.result.chartData.length - 1];
      if (lastPoint && lastPoint.age < 79) {
        startAgeForBatch = lastPoint.age + 1;
        // Resume batch generation
        startBatchGeneration(bazi, userInput.year, startAgeForBatch, userInput);
      } else {
        isGenerating.value = false;
      }
      return; // Skip API call
    }

    // 3. Call AI for Base Report (0-4 years) if no cache
    const result = await generateBaseReport(bazi, apiConfig);
    analysisResult.value = result;
    currentStep.value = 'result';

    // Save initial state
    saveRecord(signature, userInput, result, 4);

    // 4. Start Background Batch Generation
    startBatchGeneration(bazi, userInput.year, 5, userInput);

  } catch (err: any) {
    errorMsg.value = err.message || '发生未知错误';
    currentStep.value = 'input';
    isGenerating.value = false;
    alert(errorMsg.value);
  }
};

const handleLoadHistory = (record: HistoryRecord) => {
  analysisResult.value = record.result;
  currentStep.value = 'result';
  isGenerating.value = true; // Set true to allow resumption

  // Check if we need to resume generation
  const lastPoint = record.result.chartData[record.result.chartData.length - 1];
  
  // Re-calculate bazi for the generator
  const bazi = calculateBazi(
    record.userInput.year,
    record.userInput.month,
    record.userInput.day,
    record.userInput.hour,
    record.userInput.minute,
    record.userInput.gender
  );

  if (lastPoint && lastPoint.age < 79) {
    startBatchGeneration(bazi, record.userInput.year, lastPoint.age + 1, record.userInput);
  } else {
    isGenerating.value = false;
  }
};

const handleBack = () => {
  isGenerating.value = false; // Stop generation loop
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
      @load-history="handleLoadHistory"
    />

    <!-- Analysis Report -->
    <AnalysisReport 
      v-if="currentStep === 'result' && analysisResult" 
      :result="analysisResult" 
      @back="handleBack"
    />
  </div>
</template>
