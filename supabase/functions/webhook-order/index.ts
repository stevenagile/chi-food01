import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    const platform = body.platform || "外送平台";
    const externalId = body.order_id || `ext-${Date.now()}`;
    const items = (body.items || []).map((item: any) => ({
      menuItem: {
        id: `ext-${item.name}`,
        name: item.name || "未知品項",
        price: Number(item.price) || 0,
        description: "",
        category: "外送",
      },
      quantity: Number(item.quantity) || 1,
      selectedOptions: {},
      note: item.note || undefined,
    }));

    const total = Number(body.total) || items.reduce((s: number, i: any) => s + i.menuItem.price * i.quantity, 0);

    // Check ingredient availability before accepting the order
    const { data: availability, error: checkError } = await supabase.rpc(
      "check_ingredient_availability",
      { p_items: items }
    );

    if (checkError) {
      console.error("Availability check error:", checkError);
      // If check fails, still reject to be safe
      return new Response(JSON.stringify({
        success: false,
        error: "庫存檢查失敗",
        details: checkError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (availability && !availability.available) {
      return new Response(JSON.stringify({
        success: false,
        error: "庫存不足，無法接單",
        unavailable_items: availability.unavailable_items,
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = {
      id: externalId,
      type: "外帶",
      table_number: null,
      items: JSON.stringify(items),
      total,
      status: "待確認",
      payment_status: "未付款",
      customer_name: body.customer_name || `${platform} 訂單`,
      customer_phone: body.customer_phone || null,
    };

    const { error } = await supabase.from("orders").insert(order);

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, order_id: externalId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
