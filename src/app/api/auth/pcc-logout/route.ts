export async function GET() {
  const headers = new Headers({ Location: '/pcc-login' })
  const base = 'Path=/; Max-Age=0; SameSite=Lax'
  headers.append('Set-Cookie', `nx_pcc_session=; ${base}`)
  headers.append('Set-Cookie', `nx_session=; ${base}; HttpOnly`)
  headers.append('Set-Cookie', `nx_colaborador=; ${base}`)
  return new Response(null, { status: 302, headers })
}
