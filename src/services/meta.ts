import axios from 'axios';

const API_BASE = '/api/meta';

export interface MetaAccount {
    id: string; // act_123
    account_id: string; // 123
    name: string;
    last_fetch_status?: 'SUCCESS_WITH_DATA' | 'SUCCESS_NO_DATA' | 'FAILED';
    last_fetch_at?: string;
}

export interface MetaConnection {
    isConnected: boolean;
    aggregateStatus?: 'SUCCESS_WITH_DATA' | 'SUCCESS_NO_DATA' | 'FAILED' | 'PENDING';
    accounts: MetaAccount[];
}

export const metaService = {
    // Context/Status
    getConnectionStatus: async (): Promise<MetaConnection | null> => {
        try {
            const response = await axios.get(`${API_BASE}/context`);
            return response.data.connection || null;
        } catch (error) {
            console.error('[Meta Service] Failed to check status:', error);
            return null;
        }
    }
};
