<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { HistoryRecord } from '../types';
import { getRecords, deleteRecord } from '../services/history';

const emit = defineEmits(['select', 'close']);
const records = ref<HistoryRecord[]>([]);

const loadRecords = () => {
  records.value = getRecords();
};

onMounted(() => {
  loadRecords();
});

const handleDelete = (id: string, event: Event) => {
  event.stopPropagation();
  if (confirm('确定要删除这条记录吗？')) {
    deleteRecord(id);
    loadRecords();
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const formatBazi = (input: any) => {
  return `${input.year}年${input.month}月${input.day}日 ${input.hour}时 (${input.gender === 'male' ? '男' : '女'})`;
};
</script>

<template>
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-900">历史查询记录</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pr-2">
        <div v-if="records.length === 0" class="text-center py-8 text-gray-400">
          暂无历史记录
        </div>
        
        <div 
          v-for="record in records" 
          :key="record.id"
          @click="$emit('select', record)"
          class="bg-gray-50 border border-gray-100 hover:border-blue-300 hover:bg-blue-50 rounded-lg p-4 cursor-pointer transition-all group relative"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-bold text-gray-900">{{ formatBazi(record.userInput) }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ formatDate(record.timestamp) }}</div>
            </div>
            <div class="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-200 text-gray-600">
               进度: {{ record.lastAgeGenerated }}岁
            </div>
          </div>
          
          <div class="text-sm text-gray-600 line-clamp-2">
            {{ record.result.analysis.summary }}
          </div>

          <button 
            @click="handleDelete(record.id, $event)"
            class="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
            title="删除记录"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      
      <div class="mt-4 pt-4 border-t border-gray-100 text-center">
        <p class="text-xs text-gray-400">记录保存在本地浏览器缓存中</p>
      </div>
    </div>
  </div>
</template>
