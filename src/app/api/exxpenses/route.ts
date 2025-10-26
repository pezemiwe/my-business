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
    .from("expenses")
    .select(
      `
      id,
      description,
      amount,
      expense_date,
      category_id,
      created_at
    `
    )
    .eq("user_id", user.id)
    .order("expense_date", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { description, amount, category_id, expense_date } = body;

  if (!description || !amount) {
    return NextResponse.json(
      { error: "Description and amount are required" },
      { status: 400 }
    );
  }

  if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
    return NextResponse.json(
      { error: "Amount must be a valid positive number" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      description,
      amount: parseFloat(amount),
      category_id: category_id || null,
      expense_date: expense_date || new Date().toISOString().split("T")[0],
      user_id: user.id,
    })
    .select(
      `
      id,
      description,
      amount,
      expense_date,
      category_id,
      created_at
    `
    )
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
  const { id, description, amount, category_id, expense_date } = body;

  if (!id)
    return NextResponse.json({ error: "Missing expense ID" }, { status: 400 });

  if (
    amount !== undefined &&
    (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)
  ) {
    return NextResponse.json(
      { error: "Amount must be a valid positive number" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      description,
      amount: amount ? parseFloat(amount) : undefined,
      category_id: category_id || null,
      expense_date,
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
    return NextResponse.json({ error: "Missing expense ID" }, { status: 400 });

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
