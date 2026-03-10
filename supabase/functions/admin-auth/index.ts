import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    if (action === "login") {
      const { username, password } = body;
      
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Geçersiz kullanıcı adı veya şifre" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify password using pgcrypto via RPC
      const { data: match } = await supabase.rpc("admin_verify_password", {
        p_username: username,
        p_password: password,
      });

      if (!match) {
        return new Response(JSON.stringify({ error: "Geçersiz kullanıcı adı veya şifre" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create a simple token (base64 encoded user info + timestamp)
      const tokenPayload = {
        id: data.id,
        username: data.username,
        is_primary: data.is_primary,
        permissions: data.permissions,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
      };
      const token = btoa(JSON.stringify(tokenPayload));

      const { password_hash, ...user } = data;
      return new Response(JSON.stringify({ user, token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const { token } = body;
      try {
        const payload = JSON.parse(atob(token));
        if (payload.exp < Date.now()) {
          return new Response(JSON.stringify({ error: "Token süresi dolmuş" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Fetch fresh user data
        const { data } = await supabase
          .from("admin_users")
          .select("id, username, ad, soyad, email, telefon, pozisyon, is_primary, permissions, created_at")
          .eq("id", payload.id)
          .single();

        if (!data) {
          return new Response(JSON.stringify({ error: "Kullanıcı bulunamadı" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ user: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Geçersiz token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "list-users") {
      const { token } = body;
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now()) {
        return new Response(JSON.stringify({ error: "Yetkisiz" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data } = await supabase
        .from("admin_users")
        .select("id, username, ad, soyad, email, telefon, pozisyon, is_primary, permissions, created_at")
        .order("created_at", { ascending: true });

      return new Response(JSON.stringify({ users: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-user") {
      const { token, user: newUser } = body;
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now() || (!payload.is_primary && !payload.permissions?.kullanici_ekle)) {
        return new Response(JSON.stringify({ error: "Yetkisiz" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Hash password
      const { data: hashResult } = await supabase.rpc("admin_hash_password", {
        p_password: newUser.password,
      });

      const { data, error } = await supabase
        .from("admin_users")
        .insert({
          username: newUser.username,
          password_hash: hashResult,
          ad: newUser.ad,
          soyad: newUser.soyad,
          email: newUser.email || null,
          telefon: newUser.telefon || null,
          pozisyon: newUser.pozisyon,
          permissions: newUser.permissions,
          created_by: payload.id,
        })
        .select("id, username, ad, soyad, email, telefon, pozisyon, is_primary, permissions, created_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-user") {
      const { token, userId, updates } = body;
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now() || (!payload.is_primary && !payload.permissions?.kullanici_yonet)) {
        return new Response(JSON.stringify({ error: "Yetkisiz" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, unknown> = {
        ad: updates.ad,
        soyad: updates.soyad,
        email: updates.email || null,
        telefon: updates.telefon || null,
        pozisyon: updates.pozisyon,
        permissions: updates.permissions,
        updated_at: new Date().toISOString(),
      };

      if (updates.password) {
        const { data: hashResult } = await supabase.rpc("admin_hash_password", {
          p_password: updates.password,
        });
        updateData.password_hash = hashResult;
      }

      const { data, error } = await supabase
        .from("admin_users")
        .update(updateData)
        .eq("id", userId)
        .select("id, username, ad, soyad, email, telefon, pozisyon, is_primary, permissions, created_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-user") {
      const { token, userId } = body;
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now() || !payload.is_primary) {
        return new Response(JSON.stringify({ error: "Yetkisiz" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", userId)
        .eq("is_primary", false);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Geçersiz istek" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
