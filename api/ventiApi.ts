import axios from 'axios';

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

const api = axios.create({ baseURL: 'http-api' });

export const ventiApi = {
    getPage: (page: number, size: number) =>
        api.get<PageResult>('/api/ventilation-modes', { params: { page, size } }).then(res => res.data),
    create: (data: VentilationMode) =>
        api.post<VentilationMode>('/api/ventilation-mode', data).then(res => res.data),
    update: (id: number, data: Partial<VentilationMode>) =>
        api.patch<VentilationMode>(`/api/ventilation-mode/${id}`, data).then(res => res.data),
    delete: (id: number) =>
        api.delete(`/api/ventilation-mode/${id}`).then(res => res.data)
};
