import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const thresholds = [
    { minutes: 60, label: '1 saat' },
    { minutes: 30, label: '30 dakika' },
    { minutes: 15, label: '15 dakika' },
  ]

  const { data: ihaleler } = await supabase
    .from('ihaleler')
    .select('id, ihale_no, baslik, bitis_tarihi, user_id')
    .eq('durum', 'devam_ediyor')
    .not('bitis_tarihi', 'is', null)

  if (!ihaleler || ihaleler.length === 0) {
    return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let inserted = 0

  for (const ihale of ihaleler) {
    const endTime = new Date(ihale.bitis_tarihi)
    const diffMs = endTime.getTime() - now.getTime()
    const diffMin = diffMs / 60000

    for (const t of thresholds) {
      if (diffMin > 0 && diffMin <= t.minutes) {
        const refId = `ihale_sure_${ihale.id}_${t.minutes}`

        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('reference_id', refId)
          .limit(1)

        if (!existing || existing.length === 0) {
          const msg = `${ihale.ihale_no} numaralı ${ihale.baslik} başlıklı ihalenizin kalan süresi ${t.label}.`
          await supabase.from('notifications').insert({
            user_id: ihale.user_id,
            type: 'ihale_sure_uyari',
            message: msg,
            link: `/manuihale/takip/${ihale.id}`,
            reference_id: refId,
          })
          inserted++
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, inserted }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
