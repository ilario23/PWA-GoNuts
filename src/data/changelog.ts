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
    version: '2.1.1',
    date: '2026-06-13',
    changes: [
      {type: 'feat', description: 'changelog_v2_1_1_0'},
      {type: 'fix', description: 'changelog_v2_1_1_1'},
      {type: 'fix', description: 'changelog_v2_1_1_2'},
    ],
  },
  {
    version: '2.1.0',
    date: '2026-06-10',
    changes: [
      {type: 'feat', description: 'changelog_v2_1_0_4'},
      {type: 'feat', description: 'changelog_v2_1_0_5'},
      {type: 'refactor', description: 'changelog_v2_1_0_6'},
      {type: 'refactor', description: 'changelog_v2_1_0_7'},
      {type: 'fix', description: 'changelog_v2_1_0_8'},
      {type: 'fix', description: 'changelog_v2_1_0_9'},
      {type: 'fix', description: 'changelog_v2_1_0_10'},
    ],
  },
  {
    version: '2.0.3',
    date: '2026-06-05',
    changes: [
      {type: 'feat', description: 'changelog_v2_1_0_0'},
      {type: 'feat', description: 'changelog_v2_1_0_1'},
      {type: 'refactor', description: 'changelog_v2_1_0_2'},
      {type: 'fix', description: 'changelog_v2_1_0_3'},
    ],
  },
  {
    version: '2.0.0',
    date: '2026-06-03',
    changes: [
      {type: 'feat', description: 'changelog_v2_0_x_0'},
      {type: 'feat', description: 'changelog_v2_0_x_1'},
      {type: 'refactor', description: 'changelog_v2_0_x_2'},
      {type: 'fix', description: 'changelog_v2_0_x_3'},
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-08',
    changes: [
      {type: 'feat', description: 'changelog_v1_x_0'},
      {type: 'feat', description: 'changelog_v1_x_1'},
      {type: 'feat', description: 'changelog_v1_x_2'},
      {type: 'fix', description: 'changelog_v1_x_3'},
    ],
  },
];
