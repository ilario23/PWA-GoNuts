export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            categories: {
                Row: {
                    active: boolean | null
                    color: string
                    created_at: string | null
                    deleted_at: string | null
                    group_id: string | null
                    icon: string
                    id: string
                    name: string
                    parent_id: string | null
                    sync_token: number | null
                    type: "income" | "expense" | "investment"
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    active?: boolean | null
                    color: string
                    created_at?: string | null
                    deleted_at?: string | null
                    group_id?: string | null
                    icon: string
                    id?: string
                    name: string
                    parent_id?: string | null
                    sync_token?: number | null
                    type: "income" | "expense" | "investment"
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    active?: boolean | null
                    color?: string
                    created_at?: string | null
                    deleted_at?: string | null
                    group_id?: string | null
                    icon?: string
                    id?: string
                    name?: string
                    parent_id?: string | null
                    sync_token?: number | null
                    type?: "income" | "expense" | "investment"
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "categories_group_id_fkey"
                        columns: ["group_id"]
                        isOneToOne: false
                        referencedRelation: "groups"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "categories_parent_id_fkey"
                        columns: ["parent_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "categories_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            category_budgets: {
                Row: {
                    amount: number
                    category_id: string
                    created_at: string | null
                    deleted_at: string | null
                    id: string
                    period: "monthly" | "yearly"
                    sync_token: number | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    amount: number
                    category_id: string
                    created_at?: string | null
                    deleted_at?: string | null
                    id?: string
                    period?: "monthly" | "yearly"
                    sync_token?: number | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    amount?: number
                    category_id?: string
                    created_at?: string | null
                    deleted_at?: string | null
                    id?: string
                    period?: "monthly" | "yearly"
                    sync_token?: number | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "category_budgets_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "category_budgets_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            contexts: {
                Row: {
                    active: boolean | null
                    created_at: string | null
                    deleted_at: string | null
                    description: string | null
                    id: string
                    name: string
                    sync_token: number | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    active?: boolean | null
                    created_at?: string | null
                    deleted_at?: string | null
                    description?: string | null
                    id?: string
                    name: string
                    sync_token?: number | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    active?: boolean | null
                    created_at?: string | null
                    deleted_at?: string | null
                    description?: string | null
                    id?: string
                    name?: string
                    sync_token?: number | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "contexts_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            group_members: {
                Row: {
                    group_id: string
                    id: string
                    joined_at: string | null
                    removed_at: string | null
                    share: number
                    sync_token: number | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    group_id: string
                    id?: string
                    joined_at?: string | null
                    removed_at?: string | null
                    share: number
                    sync_token?: number | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    group_id?: string
                    id?: string
                    joined_at?: string | null
                    removed_at?: string | null
                    share?: number
                    sync_token?: number | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "group_members_group_id_fkey"
                        columns: ["group_id"]
                        isOneToOne: false
                        referencedRelation: "groups"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "group_members_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            groups: {
                Row: {
                    created_at: string | null
                    created_by: string
                    deleted_at: string | null
                    description: string | null
                    id: string
                    name: string
                    sync_token: number | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    created_by: string
                    deleted_at?: string | null
                    description?: string | null
                    id?: string
                    name: string
                    sync_token?: number | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    created_by?: string
                    deleted_at?: string | null
                    description?: string | null
                    id?: string
                    name?: string
                    sync_token?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "groups_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    email: string | null
                    full_name: string | null
                    id: string
                    sync_token: number | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    email?: string | null
                    full_name?: string | null
                    id: string
                    sync_token?: number | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    sync_token?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            recurring_transactions: {
                Row: {
                    active: boolean | null
                    amount: number
                    category_id: string
                    context_id: string | null
                    created_at: string | null
                    deleted_at: string | null
                    description: string
                    end_date: string | null
                    frequency: "daily" | "weekly" | "monthly" | "yearly"
                    group_id: string | null
                    id: string
                    last_generated: string | null
                    paid_by_member_id: string | null
                    start_date: string
                    sync_token: number | null
                    type: "income" | "expense" | "investment"
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    active?: boolean | null
                    amount: number
                    category_id: string
                    context_id?: string | null
                    created_at?: string | null
                    deleted_at?: string | null
                    description: string
                    end_date?: string | null
                    frequency: "daily" | "weekly" | "monthly" | "yearly"
                    group_id?: string | null
                    id?: string
                    last_generated?: string | null
                    paid_by_member_id?: string | null
                    start_date: string
                    sync_token?: number | null
                    type: "income" | "expense" | "investment"
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    active?: boolean | null
                    amount?: number
                    category_id?: string
                    context_id?: string | null
                    created_at?: string | null
                    deleted_at?: string | null
                    description?: string
                    end_date?: string | null
                    frequency?: "daily" | "weekly" | "monthly" | "yearly"
                    group_id?: string | null
                    id?: string
                    last_generated?: string | null
                    paid_by_member_id?: string | null
                    start_date?: string
                    sync_token?: number | null
                    type?: "income" | "expense" | "investment"
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "recurring_transactions_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recurring_transactions_context_id_fkey"
                        columns: ["context_id"]
                        isOneToOne: false
                        referencedRelation: "contexts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recurring_transactions_group_id_fkey"
                        columns: ["group_id"]
                        isOneToOne: false
                        referencedRelation: "groups"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recurring_transactions_paid_by_member_id_fkey"
                        columns: ["paid_by_member_id"]
                        isOneToOne: false
                        referencedRelation: "group_members"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recurring_transactions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            transactions: {
                Row: {
                    amount: number
                    category_id: string
                    context_id: string | null
                    created_at: string | null
                    date: string
                    deleted_at: string | null
                    description: string
                    group_id: string | null
                    id: string
                    paid_by_member_id: string | null
                    recurrence_key: string | null
                    recurrence_occurrence_date: string | null
                    recurring_transaction_id: string | null
                    sync_token: number | null
                    type: "income" | "expense" | "investment"
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    amount: number
                    category_id: string
                    context_id?: string | null
                    created_at?: string | null
                    date: string
                    deleted_at?: string | null
                    description: string
                    group_id?: string | null
                    id?: string
                    paid_by_member_id?: string | null
                    recurrence_key?: string | null
                    recurrence_occurrence_date?: string | null
                    recurring_transaction_id?: string | null
                    sync_token?: number | null
                    type: "income" | "expense" | "investment"
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    amount?: number
                    category_id?: string
                    context_id?: string | null
                    created_at?: string | null
                    date?: string
                    deleted_at?: string | null
                    description?: string
                    group_id?: string | null
                    id?: string
                    paid_by_member_id?: string | null
                    recurrence_key?: string | null
                    recurrence_occurrence_date?: string | null
                    recurring_transaction_id?: string | null
                    sync_token?: number | null
                    type?: "income" | "expense" | "investment"
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "transactions_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_context_id_fkey"
                        columns: ["context_id"]
                        isOneToOne: false
                        referencedRelation: "contexts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_group_id_fkey"
                        columns: ["group_id"]
                        isOneToOne: false
                        referencedRelation: "groups"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_paid_by_member_id_fkey"
                        columns: ["paid_by_member_id"]
                        isOneToOne: false
                        referencedRelation: "group_members"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_recurring_transaction_id_fkey"
                        columns: ["recurring_transaction_id"]
                        isOneToOne: false
                        referencedRelation: "recurring_transactions"
                        referencedColumns: ["id"]
                    }
                ]
            }
            user_settings: {
                Row: {
                    accent_color: string | null
                    cached_month: number | null
                    currency: string | null
                    default_view: string | null
                    include_group_expenses: boolean | null
                    include_investments_in_expense_totals: boolean | null
                    language: string | null
                    last_sync_token: number | null
                    monthly_budget: number | null
                    start_of_week: string | null
                    theme: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    accent_color?: string | null
                    cached_month?: number | null
                    currency?: string | null
                    default_view?: string | null
                    include_group_expenses?: boolean | null
                    include_investments_in_expense_totals?: boolean | null
                    language?: string | null
                    last_sync_token?: number | null
                    monthly_budget?: number | null
                    start_of_week?: string | null
                    theme?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    accent_color?: string | null
                    cached_month?: number | null
                    currency?: string | null
                    default_view?: string | null
                    include_group_expenses?: boolean | null
                    include_investments_in_expense_totals?: boolean | null
                    language?: string | null
                    last_sync_token?: number | null
                    monthly_budget?: number | null
                    start_of_week?: string | null
                    theme?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_settings_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            check_user_exists: {
                Args: {
                    user_id: string
                }
                Returns: boolean
            }
            is_group_creator: {
                Args: {
                    group_id: string
                }
                Returns: boolean
            }
            is_group_member: {
                Args: {
                    group_id: string
                }
                Returns: boolean
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
