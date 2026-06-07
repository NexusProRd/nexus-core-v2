import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { slugify } from '@/lib/slug'

async function sugerirSlug(base: string, excluirId: string, supabase: any): Promise<string[]> {
  const slugs: string[] = []
  for (let i = 1; slugs.length < 5; i++) {
    const candidate = `${base}-${i}`
    const { count } = await supabase
      .from('tiendas')
      .select('*', { count: 'exact', head: true })
      .eq('slug', candidate)
      .neq('id', excluirId)
    if (count === 0) slugs.push(candidate)
  }
  return slugs
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const excluir = searchParams.get('excluir') || ''

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const slug = slugify(q)
  if (!slug) return NextResponse.json({ disponible: false, slug: '', sugerencias: [] })

  const { count } = await supabase!
    .from('tiendas')
    .select('*', { count: 'exact', head: true })
    .eq('slug', slug)
    .neq('id', excluir)

  const disponible = count === 0
  const sugerencias = disponible ? [] : await sugerirSlug(slug, excluir, supabase!)

  return NextResponse.json({ disponible, slug, sugerencias })
}
