import { test, expect } from './fixtures/auth';
import { setupStandardApiMocks, SEED_PRODUCTS } from './utils/seed';

test.describe('CUJ-02: Customer Product Browsing & Order Placement', () => {

  test('Happy Path: Browse Products -> Select -> Adjust Quantity -> Place Order', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);

    await customerPage.goto('/customer/products');
    await expect(customerPage.getByRole('heading', { name: 'Product Catalog' })).toBeVisible();

    // Verify product grid displays products
    await expect(customerPage.getByTestId('products-grid')).toBeVisible();

    // Select Sony Headphone (stock: 10, price: 4,500,000)
    const headphoneId = '13ab7375-c7b2-4e83-8cc0-dfd981ed74d7';
    await customerPage.getByTestId(`product-card-${headphoneId}`).click();

    // Verify order form appears
    await expect(customerPage.getByTestId('order-form')).toBeVisible();
    await expect(customerPage.getByTestId('order-form').getByText('Headphone Sony WH-1000XM5')).toBeVisible();

    // Verify initial total (1 unit = Rp 4.500.000)
    await expect(customerPage.getByTestId('text-order-total')).toContainText('4.500.000');

    // Change quantity to 2
    await customerPage.getByTestId('input-quantity').fill('2');

    // Verify reactive subtotal update (2 units = Rp 9.000.000)
    await expect(customerPage.getByTestId('text-order-total')).toContainText('9.000.000');

    // Submit order
    await customerPage.getByTestId('btn-confirm-order').click();

    // Verify redirect to order details
    await expect(customerPage).toHaveURL(/\/customer\/orders\//, { timeout: 10000 });
  });

  test('Failure State: Quantity Exceeds Available Stock', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);
    await customerPage.goto('/customer/products');

    // Select RTX 4090 (stock: 2)
    const rtxId = '4120ce5d-ac77-45f1-bd50-c5bc5d2725ad';
    await customerPage.getByTestId(`product-card-${rtxId}`).click();

    // Fill quantity 5 (greater than max stock 2)
    await customerPage.getByTestId('input-quantity').fill('5');
    await customerPage.getByTestId('btn-confirm-order').click();

    // Expect validation message
    await expect(customerPage.getByTestId('error-quantity')).toContainText('Only 2 units in stock');
  });

  test('Failure State: Out of Stock Product is Disabled', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);
    await customerPage.goto('/customer/products');

    const oosId = '00000000-0000-0000-0000-000000000000';
    const oosCard = customerPage.getByTestId(`product-card-${oosId}`);

    await expect(oosCard).toBeVisible();
    await expect(oosCard).toBeDisabled();
    await expect(oosCard).toContainText('Out of stock');
  });

  test('Failure State: Network Error on Product Catalog Fetch', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage, { throwProductsError: true });
    await customerPage.goto('/customer/products');

    await expect(customerPage.getByTestId('products-error')).toBeVisible();
    await expect(customerPage.getByTestId('products-error')).toContainText('Failed to load products');
  });

  test('Failure State: Empty Catalog (Zero Products)', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage, { products: [] });
    await customerPage.goto('/customer/products');

    await expect(customerPage.getByTestId('empty-products-state')).toBeVisible();
    await expect(customerPage.getByTestId('empty-products-state')).toContainText('No products available');
  });

});
