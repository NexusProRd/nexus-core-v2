import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

let tiendaId: string

test.beforeAll(async () => {
  tiendaId = crypto.randomUUID()

  const { error: errTienda } = await supabase.from('tiendas').insert({
    id: tiendaId,
    id_owner: crypto.randomUUID(),
    nombre_tienda: 'Tienda Test QA',
    whatsapp_num: '8095551234',
    pais_codigo: 'DO',
    moneda_simbolo: 'RD$',
    plan_nivel: 'basico',
    esta_activa: true,
    token_productos_limite: 50,
    tokens_disponibles: 0,
  })
  if (errTienda) throw new Error(`Falló insert tienda: ${errTienda.message}`)

  const { error: errProd1 } = await supabase.from('productos').insert({
    id_tienda: tiendaId,
    nombre: 'Champú Antipulgas',
    precio: 450,
    stock: 10,
    in_stock: true,
    costo_compra: 270,
  })
  if (errProd1) throw new Error(`Falló insert producto 1: ${errProd1.message}`)

  const { error: errProd2 } = await supabase.from('productos').insert({
    id_tienda: tiendaId,
    nombre: 'Grooming Estilo Itachi',
    precio: 0,
    stock: 0,
    in_stock: true,
    costo_compra: 0,
  })
  if (errProd2) throw new Error(`Falló insert producto 2: ${errProd2.message}`)
})

test('Simulación Completa de Carrito e Inserción de Pedido Híbrido', async ({ page }) => {
  await page.goto(`http://localhost:3000/catalogo/${tiendaId}`)
  await page.waitForLoadState('networkidle')

  const tarjetaFisico = page.locator('text=Champú Antipulgas').locator('..')
  const btnMas = tarjetaFisico.locator('button:has-text("+")')
  await btnMas.click()
  const btnCarrito = tarjetaFisico.locator('button:has-text("Carrito")')
  await btnCarrito.click()

  const tarjetaServicio = page.locator('text=Grooming Estilo Itachi').locator('..')
  const btnReservar = tarjetaServicio.locator('button:has-text("Reservar")')
  await btnReservar.click()

  const btnFloatingCart = page.locator('button:has-text("Carrito")').last()
  await btnFloatingCart.click()
  await page.waitForTimeout(300)

  const inputNombre = page.locator('input[placeholder="Tu nombre"]')
  await inputNombre.fill('Bot QA Dinámico')

  const inputTelefono = page.locator('input[placeholder="+1 809 123 4567"]')
  await inputTelefono.fill('8095551234')

  let pedidoId = ''
  await page.route('**/wa.me/**', async route => {
    pedidoId = await page.evaluate((id) => {
      return localStorage.getItem(`nexus-last-order-${id}`) || ''
    }, tiendaId)
    await route.abort()
  })

  const btnEnviar = page.locator('button:has-text("Enviar Pedido por WhatsApp")')
  await btnEnviar.click()
  await page.waitForTimeout(1000)

  if (pedidoId) {
    await page.goto(`http://localhost:3000/catalogo/exito?pedido=${pedidoId}&tienda=${tiendaId}`)
    await page.waitForLoadState('networkidle')
  }

  await expect(page).toHaveURL(/\/catalogo\/exito/)
  await expect(page.locator('h1')).toContainText('¡Pedido Enviado!')
})

test.afterAll(async () => {
  if (tiendaId) {
    await supabase.from('tiendas').delete().eq('id', tiendaId)
  }
})
