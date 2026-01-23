
// MOCK DATA GENERATORS

export const MOCK_GA4_PROPERTIES = [
    {
        property: 'properties/123456789',
        displayName: 'Stratapilot Demo Store (Mock)',
        industryCategory: 'SHOPPING',
        timeZone: 'America/New_York',
        currencyCode: 'USD'
    }
];

export const generateMockReport = (type: string, days: number = 30) => {
    // Helper to generate date ranges
    const now = new Date();
    const rows = [];

    // OVERVIEW / TREND DATA (Time Series)
    if (type === 'overview') {
        for (let i = days; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

            rows.push({
                dimensionValues: [{ value: dateStr }],
                metricValues: [
                    { value: (1000 + Math.random() * 500).toFixed(0) }, // activeUsers
                    { value: (1200 + Math.random() * 600).toFixed(0) }, // sessions
                    { value: (3000 + Math.random() * 1000).toFixed(2) }, // eventRevenue
                    { value: (25 + Math.random() * 10).toFixed(0) } // conversions
                ]
            });
        }

        return {
            dimensionHeaders: [{ name: 'date' }],
            metricHeaders: [
                { name: 'activeUsers', type: 'TYPE_INTEGER' },
                { name: 'sessions', type: 'TYPE_INTEGER' },
                { name: 'grossPurchaseRevenue', type: 'TYPE_CURRENCY' },
                { name: 'conversions', type: 'TYPE_INTEGER' }
            ],
            rows: rows,
            rowCount: rows.length,
            metadata: { currencyCode: 'USD', timeZone: 'America/New_York' }
        };
    }

    // ACQUISITION (Table)
    if (type === 'acquisition') {
        const sources = ['Direct', 'Organic Search', 'Paid Social', 'Email', 'Referral'];
        return {
            dimensionHeaders: [{ name: 'sessionSource' }],
            metricHeaders: [
                { name: 'activeUsers', type: 'TYPE_INTEGER' },
                { name: 'sessions', type: 'TYPE_INTEGER' },
                { name: 'conversions', type: 'TYPE_INTEGER' },
                { name: 'grossPurchaseRevenue', type: 'TYPE_CURRENCY' }
            ],
            rows: sources.map(source => ({
                dimensionValues: [{ value: source }],
                metricValues: [
                    { value: (500 + Math.random() * 2000).toFixed(0) },
                    { value: (600 + Math.random() * 2500).toFixed(0) },
                    { value: (10 + Math.random() * 50).toFixed(0) },
                    { value: (500 + Math.random() * 3000).toFixed(2) }
                ]
            })),
            rowCount: sources.length
        };
    }

    return { rows: [] }; // Fallback
};

export class MockGA4Service {
    async listProperties() {
        return MOCK_GA4_PROPERTIES;
    }

    async runReport(propertyId: string, request: any) {
        // Simple heuristic to guess report type from dimensions
        const dims = request.dimensions?.map((d: any) => d.name) || [];

        if (dims.includes('date')) return generateMockReport('overview', 30);
        if (dims.includes('sessionSource')) return generateMockReport('acquisition', 30);

        return generateMockReport('overview', 30); // Default
    }
}
