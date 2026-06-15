import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbProvider } from './indexedDbProvider';

describe('IndexedDbProvider — images de factures', () => {
  let provider: IndexedDbProvider;

  beforeEach(async () => {
    provider = new IndexedDbProvider();
    await provider.init();
    await provider.clear();
  });

  it('stocke et relit une image par id', async () => {
    const blob = new Blob(['fausse-image'], { type: 'image/jpeg' });
    await provider.putReceiptImage('img1', blob);
    const got = await provider.getReceiptImage('img1');
    // fake-indexeddb ne reconstitue pas un Blob complet (ni .type ni .text());
    // on vérifie ici la mécanique put/get par id. Le round-trip Blob réel est
    // couvert par les tests E2E navigateur.
    expect(got).not.toBeNull();
  });

  it('retourne null pour une image absente', async () => {
    expect(await provider.getReceiptImage('inexistant')).toBeNull();
  });

  it('supprime une image', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    await provider.putReceiptImage('img1', blob);
    await provider.deleteReceiptImage('img1');
    expect(await provider.getReceiptImage('img1')).toBeNull();
  });

  it('clear() efface aussi les images', async () => {
    await provider.putReceiptImage('img1', new Blob(['x'], { type: 'image/jpeg' }));
    await provider.clear();
    expect(await provider.getReceiptImage('img1')).toBeNull();
  });
});
