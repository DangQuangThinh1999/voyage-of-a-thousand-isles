// Lưu trạng thái con của trang (tab con, mục đang chọn) vào địa chỉ để tải lại vẫn giữ nguyên.
import { useState } from 'react';
import { getParam, setParam } from '../state/store';

export function useRouteParam<T extends string>(key: string, def: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (getParam(key) as T) ?? def);
  return [v, (x: T) => { setV(x); setParam(key, x === def ? null : x); }];
}
export function useRouteNum(key: string, def: number): [number, (v: number) => void] {
  const [v, setV] = useState<number>(() => { const g = getParam(key); return g !== null && !isNaN(+g) ? +g : def; });
  return [v, (x: number) => { setV(x); setParam(key, x === def ? null : String(x)); }];
}
