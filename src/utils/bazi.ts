import { Solar } from 'lunar-javascript';
import { BaziResult } from '../types';

export const calculateBazi = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: 'male' | 'female'
): BaziResult => {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // 设置流派，这里默认使用晚子时算第二天
  eightChar.setSect(2); 

  // 计算起运
  // lunar-javascript 中 getYun 参数：0为女，1为男
  const yun = eightChar.getYun(gender === 'male' ? 1 : 0);
  const startAge = yun.getStartYear();
  const daYuns = yun.getDaYun();
  const firstDaYun = daYuns.length > 1 ? daYuns[1].getGanZhi() : (daYuns.length > 0 ? daYuns[0].getGanZhi() : '未知');

  return {
    yearPillar: eightChar.getYear(),
    monthPillar: eightChar.getMonth(),
    dayPillar: eightChar.getDay(),
    hourPillar: eightChar.getTime(),
    gender,
    birthDate: `${year}-${month}-${day} ${hour}:${minute}`,
    startAge,
    firstDaYun
  };
};
