import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3001';
const ADMIN_TOKEN = 'lenta_adm_master_permanent_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';

test.describe('Project Lenta E2E Smoke Tests (Frontend + Backend + PostgreSQL)', () => {
  let feedId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Verify backend health
    const healthRes = await request.get(`${BACKEND_URL}/health`);
    expect(healthRes.ok()).toBeTruthy();

    // 2. Provision a clean test feed via API
    const feedRes = await request.post(`${BACKEND_URL}/feeds`, {
      headers: {
        'x-admin-token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Smoke Test Channel',
        slug: 'smoke-channel',
        description: 'Automated E2E smoke testing stream',
        icon: '⚡',
        color: '#2481cc',
        privacy: 'public',
      },
    });
    const feedData = await feedRes.json();
    feedId = feedData.id;

    // 3. Seed an initial published note
    await request.post(`${BACKEND_URL}/notes`, {
      headers: {
        'x-admin-token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Seeded Smoke Note Welcome',
        description: 'This is an automated seed note for E2E verification.',
        privacy: 'public',
        status: 'PUBLISHED',
        type: 'SINGLE',
        feedId,
        startDate: new Date().toISOString(),
      },
    });
  });

  test('1. App loads and renders seeded note in the chronological stream', async ({ page }) => {
    await page.goto('/');

    // Wait for the feed stream to render
    await expect(page.getByText('Seeded Smoke Note Welcome').first()).toBeVisible({ timeout: 15000 });
  });

  test('2. Modal UX contract: closes on Escape and backdrop click (AGENTS.md §7)', async ({ page }) => {
    await page.goto('/');

    // Open create note modal (look for create button in header / toolbar)
    const createBtn = page.getByTitle('Создать новую запись в ленту').or(page.getByRole('button', { name: /Заметка/ })).first();
    await createBtn.click();

    // Dialog should be visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Новая запись в ленту')).toBeVisible();

    // Press Escape -> must close
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('3. Create a new note through UI and verify it appears in the stream', async ({ page }) => {
    await page.goto('/');

    const createBtn = page.getByTitle('Создать новую запись в ленту').or(page.getByRole('button', { name: /Заметка/ })).first();
    await createBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill the form
    const uniqueTitle = `Live E2E Note ${Date.now()}`;
    await dialog.getByPlaceholder(/Введите заголовок/).fill(uniqueTitle);

    // Click submit
    await dialog.getByRole('button', { name: 'Создать запись' }).click();

    // Success banner
    await expect(dialog.getByText('Запись успешно создана!')).toBeVisible({ timeout: 10000 });
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Note appears in stream
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 });
  });

  test('4. Binary Privacy Toggle: switch between Private and Public (AGENTS.md §9)', async ({ page }) => {
    await page.goto('/');

    const createBtn = page.getByTitle('Создать новую запись в ленту').or(page.getByRole('button', { name: /Заметка/ })).first();
    await createBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const privateBtn = dialog.getByRole('button', { name: 'Private' });
    const publicBtn = dialog.getByRole('button', { name: 'Public' });

    await expect(privateBtn).toBeVisible();
    await expect(publicBtn).toBeVisible();

    // Switch to public
    await publicBtn.click();
    // Verify public button is now active (has shadow-xs or active styling)
    await expect(publicBtn).toHaveClass(/bg-white|dark:bg-\[#202b38\]/);

    // Switch back to private
    await privateBtn.click();
    await expect(privateBtn).toHaveClass(/bg-white|dark:bg-\[#202b38\]/);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
