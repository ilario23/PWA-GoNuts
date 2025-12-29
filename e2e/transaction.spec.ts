import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe('Transaction Flow', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let testUser: any;

    test.beforeAll(async () => {
        if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not found');

        // Initialize Supabase Admin URL
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Create a fresh user for this test (shared for both mobile and desktop tests)
        const email = `e2e_${Date.now()}@example.com`;
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true
        });

        if (createError) throw createError;
        if (!user) throw new Error('Failed to create test user');
        testUser = user;

        console.log('Created Test User:', testUser.id);

        // 2. Create a Category for this user
        const { error: catError } = await supabase
            .from('categories')
            .insert({
                user_id: testUser.id,
                name: 'E2E Category',
                icon: 'Box',
                color: '#ff0000',
                type: 'expense',
                active: 1
            })
            .select()
            .single();

        if (catError) throw catError;

        // Initialize user settings
        await supabase.from('user_settings').insert({
            user_id: testUser.id,
            currency: 'EUR',
            language: 'it'
        });
    });

    // Login hook to run before each test
    test.beforeEach(async ({ page }) => {
        // Bypass Welcome Wizard
        await page.addInitScript(() => {
            window.localStorage.setItem('gonuts_welcome_wizard', JSON.stringify({
                completed: true,
                skipped: false,
                completedAt: new Date().toISOString(),
            }));
        });

        await page.goto('/auth');
        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
    });

    test.describe('Mobile', () => {
        test.use({ viewport: { width: 390, height: 844 } });

        test('should add transaction via FAB', async ({ page }) => {
            // 1. Open Add Transaction Dialog (FAB)
            const fab = page.getByTestId('add-transaction-fab');
            await fab.waitFor({ state: 'visible' });
            await fab.click();

            // 2. Fill Transaction Form
            const dialog = page.locator('div[role="dialog"]');
            await expect(dialog).toBeVisible();

            await page.getByTestId('amount-input').fill('123.45');
            await page.getByTestId('description-input').fill('Mobile Transaction');

            // Category Selection (Mobile uses Drawer)
            await page.getByTestId('category-trigger').click();
            const drawer = page.locator('div[role="dialog"]').last(); // Drawer is also a dialog, usually the last one
            await expect(drawer).toBeVisible();

            const searchInput = page.getByTestId('category-search');
            await searchInput.waitFor();
            await searchInput.fill('E2E Category');
            // Select the item
            await page.getByText('E2E Category').first().click();

            // 3. Save
            await page.getByTestId('save-transaction-button').click();

            // 4. Verify
            await expect(dialog).not.toBeVisible();
            const row = page.getByText('Mobile Transaction').first().locator('..').locator('..');
            await expect(row).toBeVisible();
            await expect(row).toContainText('123');
        });
    });

    test.describe('Desktop', () => {
        test.use({ viewport: { width: 1920, height: 1080 } });

        test('should add transaction via Top Button', async ({ page }) => {
            // 1. Open Add Transaction Dialog (Desktop Button)
            const addBtn = page.getByTestId('add-transaction-desktop');
            await addBtn.waitFor({ state: 'visible' });
            await addBtn.click();

            // 2. Fill Transaction Form
            const dialog = page.locator('div[role="dialog"]');
            await expect(dialog).toBeVisible();

            await page.getByTestId('amount-input').fill('456.78');
            await page.getByTestId('description-input').fill('Desktop Transaction');

            // Category Selection (Desktop uses Popover)
            await page.getByTestId('category-trigger').click();
            // Popover content usually appears. Search input should be visible.
            const searchInput = page.getByTestId('category-search');
            await expect(searchInput).toBeVisible();
            await searchInput.fill('E2E Category');
            await page.getByText('E2E Category').first().click();

            // 3. Save
            await page.getByTestId('save-transaction-button').click();

            // 4. Verify
            await expect(dialog).not.toBeVisible();
            const row = page.getByTestId('desktop-dashboard-grid').getByRole('row').filter({ hasText: 'Desktop Transaction' });
            await expect(row).toBeVisible();
            await expect(row).toContainText('456'); // 456.78
        });

        test('should edit transaction via Hover & Click', async ({ page }) => {
            // 1. Create Transaction
            const addBtn = page.getByTestId('add-transaction-desktop');
            await addBtn.waitFor({ state: 'visible' });
            await addBtn.click();
            await page.getByTestId('amount-input').fill('60.00');
            await page.getByTestId('description-input').fill('Desktop Edit Tx');
            await page.getByTestId('category-trigger').click();
            const searchInput = page.getByTestId('category-search');
            await searchInput.fill('E2E Category');
            await page.getByText('E2E Category').first().click();
            await page.getByTestId('save-transaction-button').click();
            const dialog = page.locator('div[role="dialog"]');
            await expect(dialog).not.toBeVisible();

            // 2. Locate Row, Hover, Click Edit
            // Using .last() because the virtualized table structure might nest rows (outer tr > inner table > tr).
            // The inner row contains the actual actions.
            const row = page.getByTestId('desktop-dashboard-grid').getByRole('row').filter({ hasText: 'Desktop Edit Tx' }).last();
            await row.hover(); // Reveal actions
            await row.getByTestId('edit-transaction-button').click();

            // 3. Edit Dialog should appear
            await expect(page.getByTestId('save-transaction-button')).toBeVisible();

            // 4. Change Amount
            await page.getByTestId('amount-input').fill('88.88');
            await page.getByTestId('save-transaction-button').click();

            // 5. Verify
            await expect(page.getByTestId('save-transaction-button')).not.toBeVisible();
            await expect(row).toContainText('88.88');
        });
    });
});
