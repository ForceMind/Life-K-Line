<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';
import { LifeDataPoint } from '../types';

const props = defineProps<{
  data: LifeDataPoint[];
}>();

const chartContainer = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

// 计算 MA5 (5年移动平均线)
const calculateMA = (dayCount: number, data: LifeDataPoint[]) => {
  const result = [];
  for (let i = 0, len = data.length; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    let sum = 0;
    for (let j = 0; j < dayCount; j++) {
      sum += data[i - j].close;
    }
    result.push((sum / dayCount).toFixed(2));
  }
  return result;
};

const initChart = () => {
  if (!chartContainer.value) return;
  
  // Remove 'dark' theme
  chartInstance = echarts.init(chartContainer.value);
  
  // 点击空白处关闭 Tooltip
  chartInstance.getZr().on('click', (params) => {
    if (!params.target) {
      chartInstance?.dispatchAction({
        type: 'hideTip'
      });
    }
  });
  
  updateChart();
  
  window.addEventListener('resize', handleResize);
};

const handleResize = () => {
  chartInstance?.resize();
};

const updateChart = () => {
  if (!chartInstance || !props.data.length) return;

  const dates = props.data.map(item => `${item.year}\n(${item.age}岁)`);
  const values = props.data.map(item => [item.open, item.close, item.low, item.high]);
  const ma5 = calculateMA(5, props.data);

  const option: echarts.EChartsOption = {
    backgroundColor: '#ffffff',
    title: {
      text: 'Life K-Line',
      left: 'center',
      textStyle: { color: '#333' }
    },
    tooltip: {
      trigger: 'axis',
      confine: true, // 限制在图表区域内，防止手机端溢出
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#374151'
      },
      extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 200px; white-space: normal;',
      formatter: (params: any) => {
        // params 是一个数组，包含当前 hover 的所有 series 数据
        const kLineParam = params.find((p: any) => p.seriesName === 'Life Status');
        if (!kLineParam) return '';

        const index = kLineParam.dataIndex;
        const item = props.data[index];
        
        let html = `<div class="font-bold text-lg mb-2 text-gray-900">${item.year}年 (${item.age}岁) ${item.ganZhi || ''}</div>`;
        if (item.daYun) {
             html += `<div class="text-sm text-blue-600 mb-2 font-medium">大运: ${item.daYun}</div>`;
        }
        html += `<div class="text-gray-700">状态指数: <strong>${item.close}</strong></div>`;
        html += `<div class="text-xs text-gray-500 mt-1">开: ${item.open} 高: ${item.high} 低: ${item.low}</div>`;
        
        if (item.summary) {
             html += `<div class="mt-2 text-gray-500 italic border-l-2 border-gray-200 pl-2">"${item.summary}"</div>`;
        }

        if (item.events && item.events.length > 0) {
          html += `<div class="mt-3 pt-2 border-t border-gray-100"><strong>大事记:</strong></div>`;
          item.events.forEach(e => {
            // 兼容处理：e 可能是字符串，也可能是对象
            const title = typeof e === 'string' ? e : (e?.title || '');
            const desc = typeof e === 'object' && e?.description ? e.description : '';
            
            if (title) {
              html += `<div class="text-orange-600 mt-1">● ${title}</div>`;
              if (desc) {
                html += `<div class="text-xs text-gray-500 pl-4">${desc}</div>`;
              }
            }
          });
        }
        
        return html;
      }
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#9ca3af' } },
      axisLabel: { color: '#6b7280' }
    },
    yAxis: {
      scale: true,
      axisLine: { lineStyle: { color: '#9ca3af' } },
      axisLabel: { color: '#6b7280' },
      splitLine: { show: true, lineStyle: { color: '#f3f4f6' } },
      min: 0,
      max: 100
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        show: true,
        type: 'slider',
        top: '90%',
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        name: 'Life Status',
        type: 'candlestick',
        data: values,
        itemStyle: {
          color: '#ef5350',        // 阳线颜色 (Close > Open) - 红色/开心
          color0: '#26a69a',       // 阴线颜色 (Close < Open) - 绿色/遗憾
          borderColor: '#ef5350',
          borderColor0: '#26a69a'
        },
        markPoint: {
            data: [
                { type: 'max', name: '巅峰', itemStyle: { color: '#d48265' } },
                { type: 'min', name: '低谷', itemStyle: { color: '#91c7ae' } }
            ]
        }
      },
      {
        name: 'MA5 (5年均线)',
        type: 'line',
        data: ma5,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          opacity: 0.5,
          width: 2,
          color: '#e1ad55'
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

watch(() => props.data, () => {
  updateChart();
}, { deep: true });

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>

<template>
  <div ref="chartContainer" class="w-full h-full min-h-[400px]"></div>
</template>
