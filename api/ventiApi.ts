import axios from 'axios';
import http from './http';

export interface VentilationMode {
    id?: number;
    name: string;
    start_temp_diff: number;
    start_humidity_diff: number;
    end_temp_diff: number;
    end_humidity_diff: number;
}

export interface PageResult {
    total: number;
    items: VentilationMode[];
}

// const http = axios.create({ baseURL: 'http-api' });

export const ventiApi = {
    getPage: (page: number, size: number) =>
        http.get<PageResult>('/api/ventilation-modes', { params: { page, size } }).then(res => res.data),
    create: (data: VentilationMode) =>
        http.post<VentilationMode>('/api/ventilation-mode', data).then(res => res.data),
    update: (id: number, data: Partial<VentilationMode>) =>
        http.patch<VentilationMode>(`/api/ventilation-mode/${id}`, data).then(res => res.data),
    delete: (id: number) =>
        http.delete(`/api/ventilation-mode/${id}`).then(res => res.data)
};
