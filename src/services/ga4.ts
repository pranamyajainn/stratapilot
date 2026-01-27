import axios from 'axios';

const API_BASE = '/api/ga4';

export interface GA4Property {
    id: string;
    displayName: string;
}

export interface GA4Account {
    id: string;
    name: string;
    properties: GA4Property[];
}

export interface GA4Connection {
    id: string;
    property_id?: string;
    property_display_name?: string;
    revenue_allowed: boolean;
    timezone: string;
    currency: string;
    last_fetch_status?: 'SUCCESS_WITH_DATA' | 'SUCCESS_NO_DATA' | 'FAILED';
    last_fetch_at?: string;
}

export const ga4Service = {
    // Auth - handled by window.location for now, or popup
    startAuth: () => {
        window.location.href = `${API_BASE}/auth/google/start`;
    },

    disconnect: async () => {
        const response = await axios.post(`${API_BASE}/disconnect`);
        return response.data;
    },

    // Properties
    listProperties: async (): Promise<GA4Account[]> => {
        const response = await axios.get(`${API_BASE}/properties`);
        return response.data.properties;
    },

    selectProperty: async (propertyId: string) => {
        const response = await axios.post(`${API_BASE}/select`, { propertyId });
        return response.data;
    },

    // Context/Status
    getConnectionStatus: async (): Promise<GA4Connection | null> => {
        try {
            const response = await axios.get(`${API_BASE}/context`);
            return response.data.connection || null;
        } catch (error) {
            return null;
        }
    },

    updateConsent: async (revenueAllowed: boolean) => {
        const response = await axios.post(`${API_BASE}/consent`, { revenueAllowed });
        return response.data;
    },

    // Reports
    getReport: async (type: string, days: number = 30) => {
        const response = await axios.get(`${API_BASE}/reports/${type}?days=${days}`);
        return response.data;
    }
};
