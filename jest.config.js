export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^uuid$': '<rootDir>/src/__mocks__/uuid.ts',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
        '!src/**/*.stories.tsx',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    transform: {
        '^.+\\.[tj]sx?$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
                module: 'esnext',
                moduleResolution: 'bundler',
                allowJs: true,
                baseUrl: '.',
                paths: {
                    '@/*': ['./src/*']
                },
                esModuleInterop: true,
            },
        }],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    testEnvironmentOptions: {
        customExportConditions: [''],
    },
    globals: {
        'import.meta': {
            env: {
                VITE_SUPABASE_URL: 'https://test.supabase.co',
                VITE_SUPABASE_ANON_KEY: 'test-anon-key',
            },
        },
    },
};
