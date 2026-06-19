const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += CHARS[array[i] % CHARS.length]
  }
  return result
}

export function generateGiftCardCode(): string {
  return 'GC' + generateRandomString(10)
}
