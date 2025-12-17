import { LifeDataPoint } from '../types';

// 模拟一个从出生到30岁的数据
export const generateMockData = (birthYear: number): LifeDataPoint[] => {
  const data: LifeDataPoint[] = [];
  let currentStatus = 50; // 初始状态

  for (let i = 0; i <= 30; i++) {
    const year = birthYear + i;
    const age = i;
    
    // 随机生成波动，模拟人生起伏
    const change = (Math.random() - 0.5) * 20; // -10 到 +10 的变化
    
    const open = Math.max(0, Math.min(100, Math.round(currentStatus)));
    let close = Math.max(0, Math.min(100, Math.round(open + change)));
    
    // High 和 Low 必须包含 Open 和 Close
    let high = Math.max(open, close, Math.min(100, Math.round(Math.max(open, close) + Math.random() * 10)));
    let low = Math.min(open, close, Math.max(0, Math.round(Math.min(open, close) - Math.random() * 10)));

    // 添加一些特定事件
    const events = [];
    if (age === 0) events.push({ title: "出生", description: "来到这个世界" });
    if (age === 6) events.push({ title: "上小学", description: "开始义务教育" });
    if (age === 18) {
        events.push({ title: "考上大学", description: "人生新篇章" });
        high = 95; close = 90; // 高光时刻
    }
    if (age === 22) events.push({ title: "大学毕业", description: "进入社会" });
    if (age === 25 && Math.random() > 0.5) {
        events.push({ title: "遭遇挫折", description: "工作变动或失恋" });
        low = 30; close = 40; // 低谷
    }

    data.push({
      year,
      age,
      open,
      close,
      high,
      low,
      events
    });

    currentStatus = close;
  }
  return data;
};
