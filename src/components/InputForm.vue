<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue';
import { AIConfig, BaziResult } from '../types';
import { calculateBazi } from '../utils/bazi';

const emit = defineEmits(['start', 'update-config']);

const userInput = reactive({
  year: 2003,
  month: 6,
  day: 15,
  hour: 12,
  minute: 0,
  gender: 'male' as 'male' | 'female'
});

const apiConfig = reactive<AIConfig>({
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo'
});

const showSettings = ref(false);
const previewBazi = ref<BaziResult | null>(null);

// 实时计算八字
const updatePreview = () => {
  try {
    previewBazi.value = calculateBazi(
      userInput.year,
      userInput.month,
      userInput.day,
      userInput.hour,
      userInput.minute,
      userInput.gender
    );
  } catch (e) {
    console.error(e);
  }
};

watch(userInput, updatePreview, { deep: true, immediate: true });

onMounted(() => {
  const savedConfig = localStorage.getItem('life-kline-config');
  if (savedConfig) {
    const parsed = JSON.parse(savedConfig);
    apiConfig.apiKey = parsed.apiKey || '';
    apiConfig.baseUrl = parsed.baseUrl || 'https://api.openai.com/v1';
    apiConfig.model = parsed.model || 'gpt-3.5-turbo';
    emit('update-config', apiConfig);
  }
  updatePreview();
});

const saveConfig = () => {
  localStorage.setItem('life-kline-config', JSON.stringify(apiConfig));
  emit('update-config', apiConfig);
  showSettings.value = false;
};

const handleStart = () => {
  emit('start', userInput);
};
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-4 relative overflow-hidden font-sans">
    
    <div class="z-10 w-full max-w-2xl">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-black text-white rounded-lg mb-4 shadow-lg">
          <span class="text-2xl font-bold">命</span>
        </div>
        <h1 class="text-3xl font-bold mb-2 tracking-tight text-gray-900">
          Life K-Line 人生K线
        </h1>
        <p class="text-gray-500 text-sm">基于 AI 大模型驱动的命理量化系统</p>
      </div>

      <div class="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
        
        <!-- 步骤指示 -->
        <div class="flex justify-center items-center mb-8 space-x-4">
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">1</div>
            <span class="ml-2 text-sm font-medium text-gray-700">输入信息</span>
          </div>
          <div class="w-12 h-px bg-gray-200"></div>
          <div class="flex items-center opacity-50">
            <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">2</div>
            <span class="ml-2 text-sm font-medium text-gray-500">AI 推演</span>
          </div>
          <div class="w-12 h-px bg-gray-200"></div>
          <div class="flex items-center opacity-50">
            <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">3</div>
            <span class="ml-2 text-sm font-medium text-gray-500">生成报告</span>
          </div>
        </div>

        <div class="space-y-6">
          <!-- 基础信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div class="space-y-2">
                <label class="text-xs text-gray-500 font-bold uppercase tracking-wider">出生年份 (公历)</label>
                <input v-model.number="userInput.year" type="number" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="如: 2003">
             </div>
             <div class="space-y-2">
                <label class="text-xs text-gray-500 font-bold uppercase tracking-wider">性别</label>
                <select v-model="userInput.gender" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all appearance-none">
                  <option value="male">乾造 (男)</option>
                  <option value="female">坤造 (女)</option>
                </select>
             </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-2">
              <label class="text-xs text-gray-500 font-bold uppercase tracking-wider">月</label>
              <input v-model.number="userInput.month" type="number" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all">
            </div>
            <div class="space-y-2">
              <label class="text-xs text-gray-500 font-bold uppercase tracking-wider">日</label>
              <input v-model.number="userInput.day" type="number" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all">
            </div>
            <div class="space-y-2">
              <label class="text-xs text-gray-500 font-bold uppercase tracking-wider">时</label>
              <input v-model.number="userInput.hour" type="number" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all">
            </div>
          </div>

          <!-- 八字预览卡片 -->
          <div v-if="previewBazi" class="bg-orange-50 border border-orange-100 rounded-xl p-6">
            <div class="flex items-center gap-2 mb-4 text-orange-800 font-bold text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              四柱干支预览
            </div>
            <div class="grid grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-xs text-orange-600 mb-1">年柱</div>
                <div class="text-xl font-serif font-bold text-gray-900">{{ previewBazi.yearPillar }}</div>
              </div>
              <div>
                <div class="text-xs text-orange-600 mb-1">月柱</div>
                <div class="text-xl font-serif font-bold text-gray-900">{{ previewBazi.monthPillar }}</div>
              </div>
              <div>
                <div class="text-xs text-orange-600 mb-1">日柱</div>
                <div class="text-xl font-serif font-bold text-gray-900">{{ previewBazi.dayPillar }}</div>
              </div>
              <div>
                <div class="text-xs text-orange-600 mb-1">时柱</div>
                <div class="text-xl font-serif font-bold text-gray-900">{{ previewBazi.hourPillar }}</div>
              </div>
            </div>
          </div>

          <!-- 起运信息 -->
          <div v-if="previewBazi" class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
             <div class="text-center flex-1 border-r border-blue-200">
                <div class="text-xs text-blue-600 mb-1">起运年龄 (虚岁)</div>
                <div class="text-lg font-bold text-gray-900">{{ previewBazi.startAge }} 岁</div>
             </div>
             <div class="text-center flex-1">
                <div class="text-xs text-blue-600 mb-1">第一步大运</div>
                <div class="text-lg font-bold text-gray-900">{{ previewBazi.firstDaYun }}</div>
             </div>
          </div>

          <!-- Action Button -->
          <button 
            @click="handleStart"
            class="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>下一步：生成人生 K 线</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>

        <!-- Settings Trigger -->
        <div class="mt-6 text-center">
          <button @click="showSettings = true" class="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 mx-auto transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            配置 API Key
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 class="text-xl font-bold mb-4 text-gray-900">API 设置</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">API Base URL</label>
            <input v-model="apiConfig.baseUrl" type="text" class="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="https://api.openai.com/v1">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">API Key</label>
            <input v-model="apiConfig.apiKey" type="password" class="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="sk-...">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Model Name</label>
            <input v-model="apiConfig.model" type="text" class="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none" placeholder="gpt-3.5-turbo">
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button @click="showSettings = false" class="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          <button @click="saveConfig" class="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded transition-colors">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 移除之前的动画样式，保持简洁 */
</style>
