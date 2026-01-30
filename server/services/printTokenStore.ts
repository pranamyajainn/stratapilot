import { randomUUID } from 'crypto';

interface PrintSnapshot {
    data: any;
    timestamp: number;
    consumed: boolean;
}

class PrintTokenStore {
    private store: Map<string, PrintSnapshot> = new Map();
    private readonly TTL_MS = 120000; // 120 seconds

    createToken(snapshot: any): string {
        const token = randomUUID();
        this.store.set(token, {
            data: snapshot,
            timestamp: Date.now(),
            consumed: false
        });

        // Schedule cleanup
        setTimeout(() => this.cleanExpired(), this.TTL_MS + 1000);

        return token;
    }

    consumeToken(token: string): any | null {
        const snapshot = this.store.get(token);

        if (!snapshot) {
            return null;
        }

        // Check TTL
        if (Date.now() - snapshot.timestamp > this.TTL_MS) {
            this.store.delete(token);
            return null;
        }

        // Return data without deleting immediately (rely on cleanup or short TTL)
        // This fixes React.StrictMode double-fetch issues in dev
        return snapshot.data;
    }

    cleanExpired(): void {
        const now = Date.now();
        for (const [token, snapshot] of this.store.entries()) {
            if (now - snapshot.timestamp > this.TTL_MS || snapshot.consumed) {
                this.store.delete(token);
            }
        }
    }
}

export const printTokenStore = new PrintTokenStore();
