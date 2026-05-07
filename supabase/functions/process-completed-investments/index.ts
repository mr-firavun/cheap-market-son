import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active investments that have passed their end_date
    const { data: completedInvestments, error: fetchErr } = await supabase
      .from("investments")
      .select(`
        id, user_id, amount, profit_amount,
        products(name),
        profiles!investments_user_id_fkey(balance, referred_by)
      `)
      .eq("status", "active")
      .lte("end_date", new Date().toISOString());

    if (fetchErr) throw fetchErr;
    if (!completedInvestments || completedInvestments.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by user to batch balance updates
    const userMap: Record<string, {
      balance: number;
      referred_by: string | null;
      investments: Array<{ id: string; amount: number; profit_amount: number; product_name: string }>;
    }> = {};

    for (const inv of completedInvestments) {
      const profile = inv.profiles as { balance: number; referred_by: string | null } | null;
      if (!profile) continue;
      const productName = (inv.products as { name: string } | null)?.name ?? "Urun";

      if (!userMap[inv.user_id]) {
        userMap[inv.user_id] = {
          balance: Number(profile.balance),
          referred_by: profile.referred_by,
          investments: [],
        };
      }
      userMap[inv.user_id].investments.push({
        id: inv.id,
        amount: Number(inv.amount),
        profit_amount: Number(inv.profit_amount),
        product_name: productName,
      });
    }

    let totalProcessed = 0;

    for (const [userId, userData] of Object.entries(userMap)) {
      let newBalance = userData.balance;
      const transactionInserts: object[] = [];
      const notificationInserts: object[] = [];
      const investmentIds: string[] = [];

      for (const inv of userData.investments) {
        const totalReturn = inv.amount + inv.profit_amount;
        newBalance += totalReturn;
        investmentIds.push(inv.id);

        transactionInserts.push({
          user_id: userId,
          type: "profit",
          amount: totalReturn,
          status: "completed",
          notes: `${inv.product_name} - Kar odendi`,
          reference_id: inv.id,
        });

        notificationInserts.push({
          user_id: userId,
          title: "Urun Satildi & Kar Odendi",
          message: `"${inv.product_name}" urununuz tamamlandi! $${inv.amount.toFixed(2)} yatiriminiz + $${inv.profit_amount.toFixed(2)} kar ile birlikte $${totalReturn.toFixed(2)} bakiyenize eklendi.`,
          type: "profit",
        });

        // Referral bonus
        if (userData.referred_by) {
          const referralBonus = inv.profit_amount * 0.1;
          transactionInserts.push({
            user_id: userData.referred_by,
            type: "referral_bonus",
            amount: referralBonus,
            status: "completed",
            notes: `Referral komisyonu - ${inv.product_name}`,
            reference_id: inv.id,
          });

          // Update referrer balance
          const { data: refProfile } = await supabase
            .from("profiles")
            .select("balance")
            .eq("id", userData.referred_by)
            .maybeSingle();
          if (refProfile) {
            await supabase
              .from("profiles")
              .update({ balance: Number(refProfile.balance) + referralBonus })
              .eq("id", userData.referred_by);
          }
        }
      }

      // Mark investments as completed
      await supabase
        .from("investments")
        .update({ status: "completed" })
        .in("id", investmentIds);

      // Update user balance
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", userId);

      // Insert transactions
      if (transactionInserts.length > 0) {
        await supabase.from("transactions").insert(transactionInserts);
      }

      // Insert notifications
      if (notificationInserts.length > 0) {
        await supabase.from("notifications").insert(notificationInserts);
      }

      totalProcessed += investmentIds.length;
    }

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
