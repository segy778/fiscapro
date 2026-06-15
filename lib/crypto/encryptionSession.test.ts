import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionSession } from './encryptionSession';

describe('EncryptionSession', () => {
  let session: EncryptionSession;
  beforeEach(() => { session = new EncryptionSession(); });

  it('démarre verrouillée', () => {
    expect(session.isUnlocked).toBe(false);
  });

  it('se déverrouille après setup d\'un mot de passe', async () => {
    await session.setup('mon-mot-de-passe');
    expect(session.isUnlocked).toBe(true);
  });

  it('chiffre et déchiffre une fois déverrouillée', async () => {
    await session.setup('pw');
    const payload = await session.encrypt('revenu 5000,00 $');
    expect(await session.decrypt(payload)).toBe('revenu 5000,00 $');
  });

  it('lève une erreur si on chiffre alors qu\'elle est verrouillée', async () => {
    await expect(session.encrypt('x')).rejects.toThrow(/verrouillée/);
  });

  it('déverrouille avec le bon mot de passe via sel + jeton', async () => {
    const { salt, token } = await session.setup('correct');
    const fresh = new EncryptionSession();
    const ok = await fresh.unlock('correct', salt, token);
    expect(ok).toBe(true);
    expect(fresh.isUnlocked).toBe(true);
  });

  it('refuse un mauvais mot de passe au déverrouillage', async () => {
    const { salt, token } = await session.setup('correct');
    const fresh = new EncryptionSession();
    const ok = await fresh.unlock('incorrect', salt, token);
    expect(ok).toBe(false);
    expect(fresh.isUnlocked).toBe(false);
  });

  it('lock() oublie la clé', async () => {
    await session.setup('pw');
    session.lock();
    expect(session.isUnlocked).toBe(false);
  });

  it('les données chiffrées par une session sont lisibles par une autre avec le bon mdp', async () => {
    const { salt, token } = await session.setup('pw');
    const payload = await session.encrypt('secret partagé');
    const other = new EncryptionSession();
    await other.unlock('pw', salt, token);
    expect(await other.decrypt(payload)).toBe('secret partagé');
  });
});
