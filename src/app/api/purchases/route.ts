import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("purchases")
    .select("id, product_id, quantity, total_cost, date, created_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { product_id, quantity, total_cost, date } = body;

  if (!product_id || !quantity || !total_cost) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("purchases")
    .insert({
      product_id,
      quantity,
      total_cost,
      date: date || new Date().toISOString().split("T")[0],
      user_id: user.id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const user = await getUser(request);

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, product_id, quantity, total_cost, date } = body;

  if (!id)
    return NextResponse.json({ error: "Missing purchase ID" }, { status: 400 });

  const { error } = await supabase
    .from("purchases")
    .update({
      product_id,
      quantity,
      total_cost,
      date,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser(request);

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id } = body;

  if (!id)
    return NextResponse.json({ error: "Missing purchase ID" }, { status: 400 });

  const { error } = await supabase
    .from("purchases")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
