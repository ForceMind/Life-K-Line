<script setup lang="ts">
import { ref } from 'vue';
import html2canvas from 'html2canvas';
import LifeChart from './LifeChart.vue';
import { FullAnalysisResult } from '../types';

defineProps<{
  result: FullAnalysisResult;
}>();

const emit = defineEmits(['back']);

const reportRef = ref<HTMLElement | null>(null);
const isExporting = ref(false);

const handleExportImage = async () => {
  if (!reportRef.value) return;
  isExporting.value = true;
  
  try {
    const canvas = await html2canvas(reportRef.value, {
      backgroundColor: '#ffffff', // 亮色背景
      scale: 2,
      useCORS: true
    });
    
    const link = document.createElement('a');
    link.download = `Life-K-Line-Report-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    alert('导出图片失败，请重试');
  } finally {
    isExporting.value = false;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-gray-400';
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 overflow-y-auto font-sans">
    <!-- Toolbar -->
    <div class="max-w-6xl mx-auto mb-6 flex justify-between items-center">
      <button 
        @click="emit('back')"
        class="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        返回重测
      </button>
      
      <button 
        @click="handleExportImage"
        :disabled="isExporting"
        class="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors text-sm shadow-sm text-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        {{ isExporting ? '生成中...' : '保存为图片' }}
      </button>
    </div>

    <!-- Report Content -->
    <div ref="reportRef" class="max-w-6xl mx-auto bg-white p-4 md:p-8 rounded-xl border border-gray-100 shadow-xl">
      <!-- Header -->
      <div class="text-center mb-8 border-b border-gray-100 pb-6 relative">
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2">
          Life K-Line 命理分析报告
        </h1>
        
        <!-- Status Badge (Moved here) -->
        <div v-if="result.chartData.length < 80" class="absolute top-0 right-0 hidden md:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 text-xs text-blue-600">
           <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
           <span>天机推演中... ({{ result.chartData.length }}/80年)</span>
        </div>

        <div class="flex justify-center gap-4 text-sm text-gray-500 mt-4 items-center">
          <div class="flex gap-2 items-center">
            <span>八字:</span>
            <span class="text-orange-600 font-bold font-serif text-base">{{ result.analysis.bazi.join(' ') }}</span>
          </div>
          <div class="w-px h-4 bg-gray-300"></div>
          <div class="flex gap-2 items-center">
            <span>人生总评:</span>
            <span class="text-3xl font-bold leading-none" :class="getScoreColor(result.analysis.totalScore)">{{ result.analysis.totalScore }}</span>
          </div>
        </div>
        
        <!-- Mobile Status Badge -->
        <div v-if="result.chartData.length < 80" class="md:hidden mt-4 flex justify-center items-center gap-2 text-xs text-blue-600">
           <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
           <span>天机推演中... ({{ result.chartData.length }}/80年)</span>
        </div>
      </div>

      <!-- Chart Section -->
      <div class="mb-8 h-[400px] md:h-[500px] bg-white rounded-xl p-4 border border-gray-100 shadow-inner relative">
        <LifeChart :data="result.chartData" />
      </div>

      <!-- Analysis Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <!-- Summary Card -->
        <div class="col-span-1 md:col-span-2 lg:col-span-3 bg-gray-50 p-6 rounded-xl border border-gray-100">
          <div class="flex justify-between items-start mb-3">
            <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span class="text-purple-600">✦</span> 总体运势
            </h3>
            <span class="text-sm font-mono font-bold" :class="getScoreColor(result.analysis.summaryScore)">{{ result.analysis.summaryScore }}分</span>
          </div>
          <p class="text-gray-600 leading-relaxed">{{ result.analysis.summary }}</p>
        </div>

        <!-- Detail Cards -->
        <div v-for="(item, key) in {
          personality: { label: '性格分析', icon: '🧠', score: result.analysis.personalityScore, text: result.analysis.personality },
          industry: { label: '事业发展', icon: '💼', score: result.analysis.industryScore, text: result.analysis.industry },
          wealth: { label: '财富等级', icon: '💰', score: result.analysis.wealthScore, text: result.analysis.wealth },
          marriage: { label: '婚姻姻缘', icon: '❤️', score: result.analysis.marriageScore, text: result.analysis.marriage },
          health: { label: '身体健康', icon: '💊', score: result.analysis.healthScore, text: result.analysis.health },
          family: { label: '六亲关系', icon: '👨‍👩‍👧', score: result.analysis.familyScore, text: result.analysis.family },
          fengShui: { label: '发展风水', icon: '🧭', score: result.analysis.fengShuiScore, text: result.analysis.fengShui },
          appearance: { label: '外貌特征', icon: '👀', score: result.analysis.appearanceScore, text: result.analysis.appearance },
        }" :key="key" class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-bold text-gray-800 flex items-center gap-2">
              <span>{{ item.icon }}</span> {{ item.label }}
            </h4>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold" :class="getScoreColor(item.score)">{{ item.score }}分</span>
              <div class="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-red-500 to-yellow-500" :style="{ width: `${item.score}%` }"></div>
              </div>
            </div>
          </div>
          <p class="text-sm text-gray-500 leading-relaxed">{{ item.text }}</p>
        </div>
      </div>

      <!-- Score Explanation -->
      <div class="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-100">
        <h4 class="text-sm font-bold text-gray-700 mb-4">评分详解</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="flex items-start gap-2">
            <div class="w-2 h-2 rounded-full bg-red-500 mt-1"></div>
            <div>
              <span class="font-bold text-gray-900">80-100分 (大吉/优秀)</span>
              <p class="text-gray-500 mt-1">运势强劲，天赋异禀，在该领域具有显著优势，易获成功。</p>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <div class="w-2 h-2 rounded-full bg-yellow-500 mt-1"></div>
            <div>
              <span class="font-bold text-gray-900">60-79分 (中平/良好)</span>
              <p class="text-gray-500 mt-1">运势平稳，虽无大起大落，但通过后天努力可获安稳发展。</p>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <div class="w-2 h-2 rounded-full bg-gray-400 mt-1"></div>
            <div>
              <span class="font-bold text-gray-900">0-59分 (需补/谨慎)</span>
              <p class="text-gray-500 mt-1">先天势能较弱，需格外注意该领域的风险，建议韬光养晦。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center text-xs text-gray-400 pt-6 border-t border-gray-100">
        <p>此报告由 AI 命理模型生成，仅供娱乐参考，不构成任何人生建议。</p>
        <p class="mt-1">Life K-Line © 2025</p>
      </div>
    </div>
  </div>
</template>
