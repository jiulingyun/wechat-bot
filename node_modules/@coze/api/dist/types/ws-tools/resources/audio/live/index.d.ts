import { APIResource } from '../../resource';
import { type RequestOptions } from '../../../core';
export declare class Live extends APIResource {
    /**
     * 拉流 获取收听者信息
     */
    retrieve(liveId: string, options?: RequestOptions): Promise<RetrieveLiveData>;
}
export interface RetrieveLiveData {
    app_id: string;
    stream_infos: StreamInfo[];
}
export interface StreamInfo {
    stream_id: string;
    name: string;
    live_type: LiveType;
}
export declare enum LiveType {
    Origin = "origin",// 原生流
    Translation = "translation"
}
