import { expect, test, Page } from '@playwright/test';
import { addresses, emptyAddresses } from './addresses-test-vector';

async function hasTransactions(page: Page) {
  await expect(page.locator('[data-test=account-transaction-list]')).toHaveCount(1);
}

async function hasNoTransactions(page: Page) {
  await expect(page.locator('[data-test=account-transaction-list]')).toHaveCount(0);
}

test.describe('/address page', () => {
  test.describe('Loads the address pages (non empty addresses)', () => {
    Object.keys(addresses).forEach((network: string) => {
      Object.keys((addresses as any)[network]).forEach((type: string) => {
        (addresses as any)[network][type].forEach((address: string) => {
          test(`transactions type ${type} with address=${address} on network=${network}`, async ({
            page,
          }) => {
            await page.goto(`/address/${address}?chain=${network}`);
            await expect(page.locator('[data-test=address-title]')).toBeTruthy();
            await hasTransactions(page);
          });
        });
      });
    });
  });

  test.describe('Loads the address pages (empty addresses)', () => {
    Object.keys(emptyAddresses).forEach((network: string) => {
      Object.keys((emptyAddresses as any)[network]).forEach((type: string) => {
        (emptyAddresses as any)[network][type].forEach((address: string) => {
          test(`transactions type ${type} with address=${address} on network=${network}`, async ({
            page,
          }) => {
            await page.goto(`/address/${address}?chain=${network}`);
            await expect(page.locator('[data-test=address-title]')).toBeTruthy();
            await page.waitForSelector('[data-test=account-transaction-list]');
            await hasNoTransactions(page);
          });
        });
      });
    });
  });

  test.describe('Pending tab', () => {
    test('renders unconditionally and is reachable via ?tab=pending', async ({ page }) => {
      const network = Object.keys(addresses)[0];
      const type = Object.keys((addresses as any)[network])[0];
      const address = (addresses as any)[network][type][0];
      await page.goto(`/address/${address}?chain=${network}&tab=pending`);
      await expect(page.getByRole('tab', { name: 'Pending' })).toBeVisible();
    });
  });
});
