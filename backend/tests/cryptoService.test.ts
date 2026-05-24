import { encrypt, decrypt } from '../src/services/cryptoService'

process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!!!'

describe('cryptoService', () => {
  it('encrypts and decrypts round-trip', () => {
    const plaintext = JSON.stringify({ apiKey: 'secret123', url: 'http://example.com' })
    const ciphertext = encrypt(plaintext)
    expect(ciphertext).not.toBe(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const plaintext = 'same input'
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext))
  })
})
