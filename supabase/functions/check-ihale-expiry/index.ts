import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = "https://type-tree-builder.lovable.app";

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
    return new Response(JSON.stringify({ ok: true, inserted: 0, emails: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let inserted = 0
  let emailsSent = 0

  for (const ihale of ihaleler) {
    const endTime = new Date(ihale.bitis_tarihi)
    const diffMs = endTime.getTime() - now.getTime()
    const diffMin = diffMs / 60000

    // Check if expired - send ihale_suresi_doldu email
    if (diffMin <= 0) {
      const expiredRefId = `ihale_expired_email_${ihale.id}`
      const { data: existingExpired } = await supabase
        .from('notifications')
        .select('id')
        .eq('reference_id', expiredRefId)
        .limit(1)

      if (!existingExpired || existingExpired.length === 0) {
        // Get firma info for email
        const { data: firma } = await supabase
          .from('firmalar')
          .select('firma_unvani')
          .eq('user_id', ihale.user_id)
          .single()

        // Send ihale_suresi_doldu email
        try {
          const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN")
          if (POSTMARK_SERVER_TOKEN) {
            const { data: { user } } = await supabase.auth.admin.getUserById(ihale.user_id)
            if (user?.email) {
              await fetch("https://api.postmarkapp.com/email/withTemplate", {
                method: "POST",
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json",
                  "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
                },
                body: JSON.stringify({
                  From: "Tekstil A.Ş. <info@tekstilas.com>",
                  To: user.email,
                  TemplateId: 43898544,
                  TemplateModel: {
                    firma_unvani: firma?.firma_unvani || "",
                    ihale_basligi: ihale.baslik,
                    ihale_takip_linki: `${SITE_URL}/ihalelerim/takip/${ihale.id}`,
                    platform_adi: "Tekstil A.Ş.",
                    destek_email: "info@manufixo.com",
                    yil: new Date().getFullYear().toString(),
                    site_url: SITE_URL,
                  },
                }),
              })
              emailsSent++
            }
          }
        } catch (e) {
          console.error(`[CHECK-IHALE-EXPIRY] Email error for ihale ${ihale.id}:`, e)
        }

        // Insert a notification to track that we sent the email
        await supabase.from('notifications').insert({
          user_id: ihale.user_id,
          type: 'ihale_suresi_doldu',
          message: `${ihale.ihale_no} numaralı ${ihale.baslik} başlıklı ihalenizin süresi dolmuştur.`,
          link: `/manuihale/takip/${ihale.id}`,
          reference_id: expiredRefId,
        })
        inserted++
      }
      continue
    }

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

  return new Response(JSON.stringify({ ok: true, inserted, emailsSent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
