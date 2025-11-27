# User Guide

Welcome to the Personal Expense Tracker PWA! This guide will help you get started and make the most of all features.

## Table of Contents

- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Features](#features)
- [Settings](#settings)
- [Offline Usage](#offline-usage)
- [Tips & Tricks](#tips--tricks)
- [Troubleshooting](#troubleshooting)

## Getting Started

### First-Time Setup

1. **Access the App**

   - Open the app URL in your browser
   - For best experience, use Chrome, Firefox, or Safari

2. **Create an Account**

   - Click "Sign Up"
   - Enter your email and password
   - Verify your email (if required)

3. **Install as PWA (Optional but Recommended)**

   - **Desktop**: Look for the install icon in the address bar
   - **Mobile**: Tap "Add to Home Screen" in the browser menu
   - The app will work like a native app!

4. **Initial Configuration**
   - Go to Settings (⚙️ icon)
   - Set your preferred:
     - Currency (EUR, USD, etc.)
     - Language (English, Italian)
     - Theme (Light, Dark, or System)
     - Accent color

### Dashboard Overview

The Dashboard is your home screen showing:

- **Quick Add Form**: Add transactions quickly
- **Monthly Summary**: Income, expenses, and balance for current month
- **Recent Transactions**: Last 5 transactions
- **Quick Stats**: Visual overview of your finances

## Core Concepts

### Transactions

Transactions are the core of the app. Each transaction has:

- **Type**: Income, Expense, or Investment
- **Amount**: How much money
- **Category**: What it's for (required)
- **Context**: Additional tag (optional)
- **Date**: When it occurred
- **Description**: What it was for

**Transaction Types**:

- 🟢 **Income**: Money you receive (salary, gifts, etc.)
- 🔴 **Expense**: Money you spend (food, rent, etc.)
- 🔵 **Investment**: Money you invest (stocks, savings, etc.)

### Categories

Categories help organize your transactions. They can be:

- **Hierarchical**: Create parent and child categories
  - Example: Food → Groceries, Restaurants
- **Type-Specific**: Each category belongs to Income, Expense, or Investment
- **Customizable**: Choose icon and color for each category

**Example Category Structure**:

```
Expenses
├── Food
│   ├── Groceries
│   └── Restaurants
├── Transportation
│   ├── Gas
│   └── Public Transit
└── Housing
    ├── Rent
    └── Utilities
```

### Contexts

Contexts are optional tags for transactions:

- **Work**: Business-related expenses
- **Personal**: Personal spending
- **Family**: Family expenses
- **Vacation**: Travel-related

Use contexts to track spending across different areas of your life.

### Recurring Transactions

Automate regular income or expenses:

- **Frequency**: Daily, Weekly, Monthly, or Yearly
- **Start Date**: When to begin
- **End Date**: When to stop (optional)
- **Auto-Generate**: Automatically creates transactions

**Examples**:

- Monthly rent payment
- Weekly grocery budget
- Annual insurance premium
- Daily coffee expense

## Features

### Adding a Transaction

**Quick Add (Dashboard)**:

1. Select transaction type (Income/Expense/Investment)
2. Choose category
3. Enter amount
4. Add description
5. Select date (defaults to today)
6. (Optional) Add context
7. Click "Add Transaction"

**From Transactions Page**:

1. Navigate to Transactions (📊 icon)
2. Click "+ Add Transaction" button
3. Fill out the form
4. Click "Add"

### Managing Categories

**Creating a Category**:

1. Go to Categories page
2. Click "+ Add Category"
3. Enter:
   - Name
   - Type (Income/Expense/Investment)
   - Icon (choose from 40+ options)
   - Color (choose from color picker)
   - Parent category (optional, for hierarchy)
   - Active status
4. Click "Add Category"

**Hierarchical Categories**:

Categories support unlimited nesting depth. The UI displays them in a collapsible tree structure:

- **Mobile**: Accordion-style cards that expand to show children
- **Desktop**: Table rows with expand/collapse arrows

**Example Structure**:

```
🏠 Home
├── 💡 Utilities
│   ├── ⚡ Electricity
│   ├── 💧 Water
│   └── 🔥 Gas
└── 🛋️ Furniture
🍽️ Food
├── 🛒 Groceries
└── 🍕 Restaurants
```

**Navigating Hierarchy**:

1. Click the arrow (▶) next to a parent category to expand
2. Child categories appear indented below
3. Badge shows number of children (e.g., "3")
4. Click again to collapse

**Editing a Category**:

1. Find the category in the list
2. Click the edit icon (✏️)
3. Make changes
4. Click "Save"

**Deleting a Category**:

1. Click the delete icon (🗑️)
2. Confirm deletion
3. If category has children, they'll be moved to parent

> [!WARNING]
> Deleting a category doesn't delete associated transactions. They'll keep the category reference.

### Setting Up Recurring Transactions

1. Go to Recurring Transactions page
2. Click "+ Add Recurring Transaction"
3. Fill out:
   - Type, Category, Amount, Description
   - Frequency (Daily/Weekly/Monthly/Yearly)
   - Start date
   - End date (optional)
4. Click "Add"

**How It Works**:

- The app checks for due recurring transactions
- Automatically generates transactions based on frequency
- Tracks last generation date to avoid duplicates

**Example**: Monthly rent of $1200

- Frequency: Monthly
- Start date: 2024-01-01
- Amount: 1200
- Category: Rent

On the 1st of each month, a new transaction is created automatically.

### Viewing Statistics

The Statistics page shows:

**Summary Cards**:

- Total Income
- Total Expenses
- Total Investments
- Net Balance

**Charts**:

- **Monthly Trends**: Line chart showing income/expenses over time
- **Category Breakdown**: Pie chart of expenses by category
- **Income Sources**: Pie chart of income by category
- **Expense Distribution**: Radial chart of top expense categories

**Filtering**:

- View specific month or year
- Compare different time periods

### Managing Contexts

1. Go to Contexts page
2. Click "+ Add Context"
3. Enter name and description
4. Click "Add"

Use contexts to tag transactions for better organization.

## Settings

### Personal Preferences

**Currency**:

- Choose your local currency
- Affects how amounts are displayed
- Common options: EUR, USD, GBP, JPY

**Language**:

- English (en)
- Italian (it)
- More languages can be added

**Theme**:

- **Light**: Bright interface
- **Dark**: Dark interface (easier on eyes)
- **System**: Follows your device settings

**Accent Color**:

- Slate (default)
- Blue
- Violet
- Green
- Orange
- Rose
- Zinc

### Data Management

**Manual Sync**:

- Click "Sync Now" to force synchronization
- Useful after making many offline changes
- Shows sync status (syncing/synced)
- Realtime sync keeps data updated automatically across devices

**Export Data**:

- Go to Settings → Data Management → Export JSON
- Downloads all your transactions, categories, and contexts
- Use for backup or migration

**Import Data**:

- Go to Settings → Data Management → Import JSON
- Select a previously exported JSON file
- Data is merged with existing records

**Clear Local Cache**:

- Deletes local data only (server data remains)
- Useful for troubleshooting sync issues
- Data re-syncs from server after clearing

## Budget Management

### Setting Up Your Budget

1. Go to **Settings**
2. Find the **Monthly Budget** section
3. Enter your spending limit (e.g., 2000)
4. Budget is saved automatically

### Budget Dashboard

On the Dashboard, you'll see:

- **Progress bar**: Visual indicator of budget usage
- **Colors**: Green (< 80%), Yellow (80-100%), Red (over budget)
- **Amounts**: How much spent vs total budget
- **Remaining**: How much you can still spend

### Budget Notifications

The app warns you automatically:

- **⚠️ At 80%**: "You've used 80% of your budget. €X remaining"
- **🚨 At 100%**: "Budget exceeded! You're €X over your limit"

Notifications appear once per session per threshold.

## Category Budgets

In addition to the overall monthly budget, you can set individual budgets per category.

### Setting a Category Budget

1. Go to **Categories** page
2. Find an expense category
3. Click the **target icon** (🎯) next to the category
4. Enter the monthly limit amount
5. Click **Save**

### Category Budget Display

On the Categories page, categories with budgets show:

- **Progress bar**: Visual spending indicator
- **Spent / Budget**: Current spending vs limit (e.g., "150 / 200")
- **Percentage**: How much of budget used
- **Color coding**:
  - Green: < 80% used
  - Yellow: 80-100% used
  - Red: Over budget

### Removing a Category Budget

1. Click the target icon on a category with a budget
2. Click **Remove Budget** (red button)

## Group Expenses

### What Are Groups?

Groups let you share expenses with others (roommates, partners, friends).
Each member has a share percentage of expenses.

### Creating a Group

1. Go to **Groups** page
2. Click **+ Add Group**
3. Enter group name and description
4. Click **Create**

### Adding Members

1. Get the User ID from the person you want to add (they can copy it from Settings)
2. In your group, click **Manage Members**
3. Paste their User ID and click **Add**
4. Set their share percentage (all shares must total 100%)

### Recording Group Expenses

1. When adding a transaction, expand **Group Expense** section
2. Select the group
3. Choose who paid
4. The expense is split according to member shares

### Group Balance

The group page shows:

- Total expenses by each member
- Who owes whom based on shares
- Settlement suggestions

## Offline Usage

### How Offline Mode Works

The app is **offline-first**, meaning:

1. All data is stored locally on your device
2. You can use all features without internet
3. Changes sync to cloud when you're back online

### Realtime Sync

When online, the app uses **Realtime sync** for instant cross-device updates:

- Changes on one device appear immediately on others
- Connection status shown in the app header
- **Green indicator**: Connected to Realtime
- **Gray indicator**: Disconnected (changes will sync when reconnected)

### Using the App Offline

**What Works Offline**:

- ✅ View all transactions
- ✅ Add new transactions
- ✅ Edit transactions
- ✅ Delete transactions
- ✅ Manage categories and contexts
- ✅ View statistics (for cached month)
- ✅ All settings

**What Requires Internet**:

- ❌ Initial login
- ❌ Syncing data across devices
- ❌ Viewing statistics for non-cached months

### Sync Status Indicators

Transactions show sync status:

- **No indicator**: Synced to cloud
- **🔄 Pending**: Waiting to sync
- **⚠️ Error**: Sync failed (will retry)

### Coming Back Online

When you reconnect to internet:

1. App automatically detects connection
2. Starts syncing pending changes
3. Shows sync progress
4. Updates with any server changes

> [!TIP]
> You can also manually sync by clicking "Sync Now" in Settings.

## App Updates (PWA)

The app automatically checks for updates and notifies you when a new version is available.

### Update Notifications

When an update is detected:

1. A toast notification appears at the bottom of the screen
2. You'll see "**Update available**" with a description
3. Two options:
   - **Reload**: Apply the update immediately
   - **Later**: Dismiss and update on next visit

### Offline Ready Notification

When the app is first installed or updated, you'll see:

- "**App ready for offline use**" toast
- This confirms all assets are cached for offline functionality

### Manual Update Check

Updates are checked automatically every hour. The app will notify you when ready.

## Tips & Tricks

### Organizing Categories

**Best Practices**:

- Create broad parent categories (Food, Transportation)
- Use specific child categories (Groceries, Gas)
- Limit depth to 2-3 levels for simplicity
- Use consistent naming conventions

**Color Coding**:

- Use similar colors for related categories
- Red/Orange for expenses
- Green for income
- Blue for investments

### Efficient Transaction Entry

**Quick Add**:

- Use the Dashboard quick add for speed
- Most common fields are pre-filled
- Date defaults to today

**Recurring Transactions**:

- Set up all regular bills as recurring
- Saves time entering monthly expenses
- Ensures you don't forget regular payments

### Budgeting with Contexts

Use contexts to track budgets:

- Create context "Groceries Budget"
- Tag all grocery transactions
- View total spending in that context
- Compare against your budget

### Monthly Reviews

**End of Month Routine**:

1. Go to Statistics page
2. Review monthly totals
3. Check category breakdowns
4. Identify areas to reduce spending
5. Adjust budget for next month

## Troubleshooting

### App Not Loading

**Problem**: White screen or loading forever

**Solutions**:

1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check internet connection
4. Try different browser

---

### Can't Sign In

**Problem**: Login fails or shows error

**Solutions**:

1. Verify email and password are correct
2. Check if email is verified (check spam folder)
3. Try password reset
4. Clear browser cookies
5. Check if Caps Lock is on

---

### Transactions Not Syncing

**Problem**: Changes not appearing on other devices

**Solutions**:

1. Check internet connection
2. Click "Sync Now" in Settings
3. Wait a few minutes and refresh
4. Check sync status indicators
5. Sign out and sign back in

---

### PWA Not Installing

**Problem**: Can't add app to home screen

**Solutions**:

1. Verify you're using HTTPS (required for PWA)
2. Try different browser (Chrome recommended)
3. Check if already installed
4. Clear browser data and try again

---

### Statistics Not Showing

**Problem**: Statistics page is empty or incorrect

**Solutions**:

1. Verify you have transactions for selected period
2. Check if month is cached (Settings)
3. Try syncing data
4. Refresh the page

---

### Offline Mode Not Working

**Problem**: App doesn't work offline

**Solutions**:

1. Verify service worker is registered (check DevTools)
2. Visit app while online first (to cache data)
3. Check if PWA is installed
4. Clear service worker and reinstall

---

### Categories Not Appearing

**Problem**: Categories missing in selector

**Solutions**:

1. Verify category type matches transaction type
2. Check if category is active (not deleted)
3. Try refreshing the page
4. Check if you're signed in

---

## FAQ

**Q: Is my data secure?**  
A: Yes! Data is stored locally on your device and synced to Supabase with Row Level Security. Only you can access your data.

**Q: Can I use this on multiple devices?**  
A: Yes! Sign in with the same account on different devices. Data syncs automatically via Realtime.

**Q: What happens if I delete the app?**  
A: Your data is safe in the cloud. Reinstall and sign in to restore everything.

**Q: Can I export my data?**  
A: Yes! Go to Settings → Data Management → Export JSON to download all your data.

**Q: Can I set a monthly budget?**  
A: Yes! Go to Settings → Monthly Budget and enter your spending limit. You'll see progress on the Dashboard and get notifications at 80% and when exceeded.

**Q: Can I set budgets per category?**  
A: Yes! On the Categories page, click the target icon (🎯) next to any expense category to set a specific budget for that category.

**Q: How do recurring transactions work?**  
A: Set them up in the Recurring page. When you open the app, any due transactions are automatically generated with a notification.

**Q: How do I delete my account?**  
A: Contact support or manually delete data from Supabase dashboard.

**Q: Does it work on iOS?**  
A: Yes! Install as PWA from Safari for best experience.

**Q: Is there a mobile app?**  
A: The PWA works like a native app when installed. No separate app needed.

**Q: Can I share expenses with others?**  
A: Yes! Create a Group, add members by their User ID, and track shared expenses with split percentages.

---

## Getting Help

- **Documentation**: Check [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md)
- **Issues**: Report bugs on GitHub
- **Feature Requests**: Open a GitHub issue
- **Questions**: Use GitHub Discussions

---

**Happy tracking! 💰**
