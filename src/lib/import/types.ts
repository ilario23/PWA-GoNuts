export type ImportSource = 'antigravity_backup' | 'legacy_vue' | 'generic_csv' | 'intesa_sanpaolo' | 'revolut';


export interface ParsedTransaction {
    id?: string; // Might be present in backups
    date: string;
    amount: number;
    currency?: string;
    description: string;
    category_id?: string;
    context_id?: string; // For GoNuts backups
    type?: "expense" | "income" | "investment"; // Often missing in CSVs
    group_id?: string; // For group expenses
    user_id?: string; // For checking ownership
    raw_data?: any; // Original row/object for debugging
}

// Assuming ParsedCategory, ParsedContext, ParsedRecurringTransaction are new types the user intends to introduce or already exist elsewhere.
import { Category } from "@/lib/db";

// For now, I'll define them as `any` to ensure the file remains syntactically correct.
type ParsedCategory = { id: string; name: string; type: "income" | "expense" | "investment";[key: string]: any };
type ParsedContext = any;
type ParsedRecurringTransaction = any;

export interface PotentialMerge {
    imported: ParsedCategory;
    existing: Category;
    score: number;
}

export interface RecurringConflict {
    imported: any; // Raw recurring object
    existing: any; // Existing recurring object
    score: number; // 0 = exact match
}

export interface ParsedData {
    source: ImportSource; // Changed to use the updated ImportSource
    transactions: ParsedTransaction[];
    categories?: ParsedCategory[]; // Optional, as some sources might not have them
    recurring?: ParsedRecurringTransaction[];
    contexts?: ParsedContext[];
    budgets?: any[];      // Used for full backups
    groups?: any[];
    group_members?: any[];
    metadata?: {
        totalItems: number;
        version?: string;
    };
    dataIntegrityIssues?: {
        orphanedTransactionCategories: { description: string; categoryId: string }[];
        orphanedRecurringCategories: { description: string; categoryId: string }[];
    };
}

export type CsvMapping = {
    dateColumn: string;
    amountColumn: string;
    feeColumn?: string;
    categoryColumn?: string;
    descriptionColumn: string;
    dateFormat?: string;
    hasHeader: boolean;
};

export interface ImportOptions {
    csvMapping?: CsvMapping;
    includeSavings?: boolean;
}

export interface TransactionParser {
    name: string;
    fileExtensions: string[];
    canParse(file: File, content: string): Promise<boolean>;
    parse(file: File, content: string, options?: ImportOptions): Promise<ParsedData>;
}

export interface ImportRule {
    id: string;
    match_string: string; // "STARBUCKS"
    match_type: 'contains' | 'exact' | 'regex'; // Retained from original
    category_id: string;
    created_at: string; // Retained from original
    active?: boolean; // Added based on the provided snippet, making it optional to avoid breaking existing usage
}
