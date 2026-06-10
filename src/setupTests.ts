import '@testing-library/jest-dom';

// jest-environment-jsdom does not expose Node's structuredClone, but
// fake-indexeddb needs it to clone records on insert.
import { deserialize, serialize } from 'node:v8';
if (typeof globalThis.structuredClone === 'undefined') {
    globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value));
}

import 'fake-indexeddb/auto';

// Mock Supabase client to avoid import.meta errors
jest.mock("./lib/supabase", () => ({
    supabase: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
    },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    takeRecords() {
        return [];
    }
    unobserve() { }
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
} as unknown as typeof ResizeObserver;

// Suppress act() warnings in tests
// These warnings are expected when testing hooks with async effects
const originalError = console.error;
beforeAll(() => {
    console.error = (...args: unknown[]) => {
        if (
            typeof args[0] === 'string' &&
            args[0].includes('Warning: An update to') &&
            args[0].includes('was not wrapped in act')
        ) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.error = originalError;
});
