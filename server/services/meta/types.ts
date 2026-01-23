export interface MetaTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
}

export interface AdAccount {
    id: string;
    account_id: string;
    name: string;
    currency: string;
    timezone_name: string;
    timezone_id: number;
    account_status: number;
    disable_reason: number;
}

export interface Campaign {
    id: string;
    name: string;
    status: string;
    objective: string;
    start_time?: string;
    stop_time?: string;
    effective_status: string;
    updated_time: string;
}

export interface AdSet {
    id: string;
    name: string;
    status: string;
    campaign_id: string;
    optimization_goal: string;
    start_time?: string;
    end_time?: string;
    updated_time: string;
}

export interface Ad {
    id: string;
    name: string;
    status: string;
    adset_id: string;
    campaign_id: string;
    creative: { id: string };
    updated_time: string;
}

export interface AdCreative {
    id: string;
    name?: string;
    object_type?: string;
    thumbnail_url?: string;
    image_url?: string;
    video_id?: string;
    title?: string;
    body?: string;
    call_to_action_type?: string;
    link_url?: string;
    instagram_actor_id?: string;
    page_id?: string;
}

export interface InsightDaily {
    date_start: string;
    date_stop: string;
    impressions?: string;
    spend?: string;
    reach?: string;
    frequency?: string;
    clicks?: string;
    unique_clicks?: string;
    ctr?: string;
    cpc?: string;
    cpm?: string;
    inline_link_clicks?: string;
    landing_page_views?: string;
    actions?: Array<{ action_type: string; value: string }>;
    video_p25_watched_actions?: Array<{ action_type: string; value: string }>;
    video_p50_watched_actions?: Array<{ action_type: string; value: string }>;
    video_p75_watched_actions?: Array<{ action_type: string; value: string }>;
    video_p100_watched_actions?: Array<{ action_type: string; value: string }>;
    video_3_sec_watched_actions?: Array<{ action_type: string; value: string }>;
    video_avg_time_watched_actions?: Array<{ action_type: string; value: string }>;
}

export enum SyncMode {
    ON_DEMAND = 'ON_DEMAND',
    SCHEDULED = 'SCHEDULED',
    BACKFILL = 'BACKFILL'
}

export interface SyncRun {
    id: string;
    account_id: string;
    mode: SyncMode;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    started_at: string;
    finished_at?: string;
    records_processed: number;
    error_message?: string;
    params_json?: string;
}
