export async function convertGiftToGiftCard(giftId: string) {
  const res = await fetch('/api/gift-convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ giftId }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { success: false as const, error: body.error || `HTTP ${res.status}` }
  }

  const data = await res.json()

  if (!data.success) {
    return { success: false as const, error: data.error || 'Error al convertir el regalo' }
  }

  return {
    success: true as const,
    giftCard: data.giftCard,
    value: data.value,
    expiresAt: data.expiresAt,
  }
}
