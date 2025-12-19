import { HistoryRecord, FullAnalysisResult } from '../types';

const STORAGE_KEY = 'life-kline-history';

export const saveRecord = (
  id: string,
  userInput: any,
  result: FullAnalysisResult,
  lastAgeGenerated: number
) => {
  console.log(`Saving history record: ${id}, age: ${lastAgeGenerated}`);
  const records = getRecords();
  const existingIndex = records.findIndex(r => r.id === id);
  
  const newRecord: HistoryRecord = {
    id,
    timestamp: Date.now(),
    userInput,
    result,
    lastAgeGenerated
  };

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord;
  } else {
    records.unshift(newRecord);
  }

  // Limit history size to 20 records to avoid localStorage quota issues
  if (records.length > 20) {
    records.pop();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const getRecords = (): HistoryRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getRecordById = (id: string): HistoryRecord | undefined => {
  const records = getRecords();
  return records.find(r => r.id === id);
};

export const deleteRecord = (id: string) => {
  const records = getRecords().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};
