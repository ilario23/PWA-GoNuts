# PWA GoNuts - Developer Documentation (v2)

> **Status**: Current Source of Truth  
> **Last Updated**: December 2025

Welcome to the definitive documentation for **PWA GoNuts**, a local-first Progressive Web App for expense tracking. This documentation ("The Bible") details the architecture, data structures, and logic flows that power the application.

## Table of Contents

1.  [**Architecture Overview**](./ARCHITECTURE.md)
    *   Learn about the "Offline-First" philosophy and the "Local DB as Mirror" concept.
    *   Understanding the bidirectional Sync Engine.

2.  [**Data Structures**](./DATA_STRUCTURE.md)
    *   **CRITICAL**: The definitive reference for the Database Schema.
    *   Mappings between Local (IndexedDB) and Remote (Supabase).
    *   Understanding Sync Tokens and Soft Deletes.

3.  [**Logic Flows & Processes**](./LOGIC_FLOWS.md)
    *   Authentication Lifecycle (Offline -> Online).
    *   The Sync Loop (Push, Pull, Retry).
    *   Recurring Transactions Generation.

4.  [**Hooks & Development Guide**](./HOOKS_GUIDE.md)
    *   How to build features using our Custom Hooks.
    *   Component rules and best practices.
    *   `useLiveQuery` vs standard React State.

5.  [**State Management**](./STATE_MANAGEMENT.md)
    *   Where data lives: Global Auth, Local DB, and UI State.

## Quick Start for Developers

### Tech Stack
*   **Frontend**: React (TypeScript), Vite
*   **Local DB**: Dexie.js (IndexedDB wrapper)
*   **Remote DB**: Supabase (PostgreSQL)
*   **Styling**: Tailwind CSS + Shadcn UI
*   **State/Sync**: Custom Hooks + Live Queries

### Key Principles
1.  **Read from Disk**: UI components almost *always* read from Dexie (via `useLiveQuery`), never directly from Supabase.
2.  **Write to Disk**: Actions (Add/Edit/Delete) write to Dexie and mark items as `pendingSync: 1`.
3.  **Sync in Background**: The background `SyncManager` handles pushing these changes to the server and handling conflicts.

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
