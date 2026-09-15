import { test, expect } from './fixtures/auth';
import { setupStandardApiMocks } from './utils/seed';

test.describe('CUJ-06: Admin Inventory & Stock Management (CRUD & Restock)', () => {

  test('Happy Path: Admin Views Inventory Table and Metrics', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.goto('/admin/inventory');
    await expect(adminPage.getByTestId('admin-inventory-page')).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: /Inventory & Stock Management/i })).toBeVisible();

    // Verify KPI metrics are visible
    await expect(adminPage.getByTestId('stat-total-skus')).toBeVisible();

    // Verify inventory table and products
    await expect(adminPage.getByTestId('inventory-table')).toBeVisible();
    await expect(adminPage.getByTestId('btn-add-product')).toBeVisible();
  });

  test('Happy Path: Admin Adds a New Product', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    // Mock Create Product endpoint
    await adminPage.route('**/api/v1/products', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Product created successfully',
            product: {
              id: 'new-prod-uuid-999',
              name: body.name,
              stock_available: body.stock,
              stock_reserved: 0,
              stock: body.stock,
              price: body.price,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await adminPage.goto('/admin/inventory');
    await adminPage.getByTestId('btn-add-product').click();

    // Fill form in modal
    await adminPage.getByTestId('input-add-product-name').fill('Apple Studio Display 27');
    await adminPage.getByTestId('input-add-product-price').fill('24999000');
    await adminPage.getByTestId('input-add-product-stock').fill('15');

    await adminPage.getByTestId('btn-submit-add-product').click();
  });

  test('Happy Path: Admin Restocks an Existing Product', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    // Mock Restock endpoint
    await adminPage.route('**/api/v1/products/*/stock', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Product restocked successfully',
          product: {
            id: '4120ce5d-ac77-45f1-bd50-c5bc5d2725ad',
            name: 'GPU NVIDIA RTX 4090 24GB',
            stock_available: 22,
            stock_reserved: 0,
            stock: 22,
            price: 28500000,
          },
        }),
      });
    });

    await adminPage.goto('/admin/inventory');
    const restockBtn = adminPage.getByTestId('btn-restock-4120ce5d-ac77-45f1-bd50-c5bc5d2725ad');
    await expect(restockBtn).toBeVisible();
    await restockBtn.click();

    await adminPage.getByTestId('input-restock-qty').fill('20');
    await adminPage.getByTestId('btn-submit-restock').click();
  });

  test('Happy Path: Admin Edits Product Details', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    // Mock Update endpoint
    await adminPage.route('**/api/v1/products/*', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Product updated successfully',
            product: {
              id: '4120ce5d-ac77-45f1-bd50-c5bc5d2725ad',
              name: body.name,
              stock_available: 2,
              stock_reserved: 0,
              stock: 2,
              price: body.price,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await adminPage.goto('/admin/inventory');
    const editBtn = adminPage.getByTestId('btn-edit-4120ce5d-ac77-45f1-bd50-c5bc5d2725ad');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    await adminPage.getByTestId('input-edit-product-name').fill('GPU NVIDIA RTX 4090 Overclocked');
    await adminPage.getByTestId('input-edit-product-price').fill('29500000');
    await adminPage.getByTestId('btn-submit-edit-product').click();
  });

  test('Happy Path: Admin Deletes a Product', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.route('**/api/v1/products/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Product deleted successfully' }),
        });
      } else {
        await route.continue();
      }
    });

    await adminPage.goto('/admin/inventory');
    const deleteBtn = adminPage.getByTestId('btn-delete-4120ce5d-ac77-45f1-bd50-c5bc5d2725ad');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    await adminPage.getByTestId('btn-confirm-delete').click();
  });

  test('Filtering: Admin Searches and Filters Product Inventory', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.goto('/admin/inventory');
    await adminPage.getByTestId('input-search-inventory').fill('Sony');

    // Verify filtered row
    await expect(adminPage.getByTestId('product-row-13ab7375-c7b2-4e83-8cc0-dfd981ed74d7')).toBeVisible();
  });
});
