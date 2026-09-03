import { expect, test } from '@playwright/test';

import { failedTxs } from './failed-transactions-test-vector';
import { txs } from './transactions-test-vector';

test.describe('/txid page — why it failed', () => {
  failedTxs.forEach(({ txid, description, headlineIncludes }) => {
    test(`explains ${description}`, async ({ page }) => {
      await page.goto(`/txid/${txid}?chain=mainnet`);
      const card = page.locator('[data-test=why-failed]');
      await expect(card).toBeVisible();
      await expect(page.locator('[data-test=why-failed-headline]')).toContainText(headlineIncludes);
      await expect(page.locator('[data-test=why-failed-headline]')).not.toContainText(
        'would have succeeded'
      );
      await page.locator('[data-test=why-failed-toggle]').click();
      await expect(page.locator('[data-test=why-failed-details]')).toBeVisible();
      await expect(page.locator('[data-test=why-failed-copy-prompt]')).toContainText(
        'Copy Prompt for Agent to Explore'
      );
    });
  });

  test('serves the agent context pack for a failed contract call', async ({ request }) => {
    const res = await request.get(`/txid/${failedTxs[0].txid}/context.md?chain=mainnet`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/markdown');
    expect(res.headers()['x-robots-tag']).toBe('noindex');
    const body = await res.text();
    expect(body).toContain('## Diagnosis (deterministic)');
    expect(body).toContain('## Playbook for an agent');
  });
});

test.describe('/txid page', () => {
  test.describe('Loads the transactions txid pages', () => {
    Object.keys(txs).forEach((network: string) => {
      Object.keys((txs as any)[network]).forEach((type: string) => {
        (txs as any)[network][type].forEach((txid: string) => {
          test(`transactions type ${type} with txid=${txid} on network=${network}`, async ({
            page,
          }) => {
            await page.goto(`/txid/${txid}?chain=${network}`);
            await expect(page.locator('[data-test=tx-header]')).toBeVisible();
          });
        });
      });
    });
  });
});
