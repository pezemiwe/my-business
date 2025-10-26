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
    .from("sales")
    .select(
      `
    id,
    quantity,
    total_sales,
    date,
    created_at,
    products (
      name
    )
  `
    )
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
  const { product_name, quantity, unit_price, date } = body;

  if (!product_name || !quantity || !unit_price) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const total_sales = quantity * unit_price;

  const { data, error } = await supabase
    .from("sales")
    .insert({
      product_name,
      quantity,
      unit_price,
      total_sales,
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
  const { id, product_name, quantity, unit_price, date } = body;

  if (!id)
    return NextResponse.json({ error: "Missing sale ID" }, { status: 400 });

  const total_sales = quantity * unit_price;

  const { error } = await supabase
    .from("sales")
    .update({
      product_name,
      quantity,
      unit_price,
      total_sales,
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
    return NextResponse.json({ error: "Missing sale ID" }, { status: 400 });

  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
