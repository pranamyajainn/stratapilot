/**
 * Creative Memory Index
 * Exports all Creative Memory Layer components
 */

// Types
export * from '../../types/creativeMemoryTypes.js';

// Database
export {
    initCreativeMemoryDatabase,
    getCreativeMemoryDb,
    closeCreativeMemoryDb,
    cleanupExpiredRecords,
    getCreativeMemoryStats,
} from './creativeMemoryDb.js';

// Store
export {
    storeCreative,
    storeCreatives,
    getCreativesByIndustry,
    getCreativesByNiche,
    getCreativesBySource,
    storePatternDistribution,
    getPatternDistribution,
    hasValidPatternDistribution,
    logIngestionStart,
    logIngestionComplete,
    getRecentIngestionLogs,
} from './creativeMemoryStore.js';

// Sources
export { CreativeMemorySourceBase } from './creativeMemorySourceBase.js';
export { MetaCreativeMemory } from './metaCreativeMemory.js';
export { GoogleCreativeMemory } from './googleCreativeMemory.js';

// Analysis
export { PatternAnalyzer } from './patternAnalyzer.js';
export { CompetitiveContextGenerator } from './competitiveContextGenerator.js';
