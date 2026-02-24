export type ChangeType = 'feat' | 'fix' | 'chore' | 'refactor';

export interface ChangeLogEntry {
    version: string;
    date: string;
    changes: {
        type: ChangeType;
        description: string;
    }[];
}

export const changelogData: ChangeLogEntry[] = [
    {
        version: "1.0.8",
        date: "2026-02-24",
        changes: [
            { type: "fix", description: "changelog_v1_0_8_0" },
        ],
    },
    {
        version: "1.0.7",
        date: "2026-01-22",
        changes: [
            { type: "feat", description: "changelog_v1_0_7_0" },
            { type: "feat", description: "changelog_v1_0_7_1" },
            { type: "fix", description: "changelog_v1_0_7_2" },
        ],
    },
    {
        version: "1.0.6",
        date: "2026-01-19",
        changes: [
            { type: "feat", description: "changelog_v1_0_6_0" },
            { type: "feat", description: "changelog_v1_0_6_1" },
            { type: "feat", description: "changelog_v1_0_6_2" },
        ],
    },
    {
        version: "1.0.5",
        date: "2026-01-16",
        changes: [
            { type: "feat", description: "changelog_v1_0_5_0" },
            { type: "feat", description: "changelog_v1_0_5_1" },
            { type: "refactor", description: "changelog_v1_0_5_2" },
            { type: "refactor", description: "changelog_v1_0_5_3" },
            { type: "fix", description: "changelog_v1_0_5_4" },
            { type: "chore", description: "changelog_v1_0_5_5" }
        ],
    },
    {
        version: "1.0.4",
        date: "2026-01-14",
        changes: [
            { type: "feat", description: "changelog_v1_0_4_0" },
            { type: "fix", description: "changelog_v1_0_4_1" },
        ],
    },
    {
        version: "1.0.3",
        date: "2026-01-10",
        changes: [
            { type: "feat", description: "changelog_v1_0_3_0" },
            { type: "feat", description: "changelog_v1_0_3_1" },
        ],
    },
    {
        version: "1.0.2",
        date: "2026-01-10",
        changes: [
            { type: "feat", description: "changelog_v1_0_2_0" },
            { type: "feat", description: "changelog_v1_0_2_1" },
            { type: "fix", description: "changelog_v1_0_2_2" },
            { type: "refactor", description: "changelog_v1_0_2_3" },
        ],
    },
    {
        version: "1.0.1",
        date: "2026-01-09",
        changes: [
            { type: "feat", description: "changelog_v1_0_1_0" },
            { type: "feat", description: "changelog_v1_0_1_1" }
        ],
    },
    {
        version: "1.0.0",
        date: "2026-01-08",
        changes: [
            { type: "feat", description: "changelog_v1_0_0_0" }
        ],
    },
];
