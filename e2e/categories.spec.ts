import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe('Categories Flow', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let testUser: any;

    test.beforeAll(async () => {
        if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not found');

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Create a fresh user
        const email = `cat_e2e_${Date.now()}@example.com`;
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true
        });

        if (createError) throw createError;
        if (!user) throw new Error('Failed to create test user');
        testUser = user;

        // Initialize user settings
        await supabase.from('user_settings').insert({
            user_id: testUser.id,
            currency: 'EUR',
            language: 'it'
        });
    });

    // Login hook
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
        test.use({ viewport: { width: 375, height: 667 } });

        test('should create and verify category', async ({ page }) => {
            await page.goto('/categories');
            const addBtn = page.getByTestId('add-category-button');
            await addBtn.waitFor({ state: 'visible' });
            await addBtn.click();

            const dialog = page.getByRole('dialog', { name: /Add Category|Aggiungi Categoria/i });
            await expect(dialog).toBeVisible();

            const categoryName = 'Mobile New Category';
            await page.getByTestId('category-name-input').fill(categoryName);
            await page.getByTestId('icon-trigger').click();
            await page.getByTestId('icon-search').fill('wallet');
            await page.getByTestId('icon-option-Wallet').click();
            await page.getByTestId('category-type-income').click();
            await page.getByTestId('save-category-button').click();
            await expect(dialog).not.toBeVisible();

            // Verify Mobile Row
            await expect(page.locator('.md\\:hidden').getByText(categoryName)).toBeVisible();
        });
    });

    test.describe('Desktop', () => {
        test.use({ viewport: { width: 1280, height: 720 } });

        test('should create and verify category', async ({ page }) => {
            await page.goto('/categories');
            const addBtn = page.getByTestId('add-category-button');
            await addBtn.waitFor({ state: 'visible' });
            await addBtn.click();

            const dialog = page.getByRole('dialog', { name: /Add Category|Aggiungi Categoria/i });
            await expect(dialog).toBeVisible();

            const categoryName = 'Desktop New Category';
            await page.getByTestId('category-name-input').fill(categoryName);
            await page.getByTestId('icon-trigger').click();
            await page.getByTestId('icon-search').fill('wallet');
            await page.getByTestId('icon-option-Wallet').click();
            await page.getByTestId('category-type-income').click();
            await page.getByTestId('save-category-button').click();
            await expect(dialog).not.toBeVisible();

            // Verify Desktop Table
            await expect(page.getByRole('table').getByText(categoryName)).toBeVisible();
        });

        test('should edit category via Hover & Click', async ({ page }) => {
            // Create first
            await page.goto('/categories');
            await page.getByTestId('add-category-button').click();
            await page.getByTestId('category-name-input').fill('Desktop Edit Cat');
            await page.getByTestId('icon-trigger').click();
            await page.getByTestId('icon-search').fill('wallet');
            await page.getByTestId('icon-option-Wallet').click();
            await page.getByTestId('save-category-button').click();

            // Wait for list update
            const row = page.getByRole('table').getByText('Desktop Edit Cat').first().locator('xpath=ancestor::tr');
            await expect(row).toBeVisible();

            await row.hover();
            await row.getByTestId('edit-category-button').click();

            await expect(page.getByTestId('save-category-button')).toBeVisible();
            await page.getByTestId('category-name-input').fill('Desktop Edited Cat');
            await page.getByTestId('save-category-button').click();

            await expect(page.getByRole('table').getByText('Desktop Edited Cat')).toBeVisible();
        });
    });
});
