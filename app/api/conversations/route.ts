import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const list = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, user.id))
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const [conversation] = await db
    .insert(conversations)
    .values({ userId: user.id, title: body.title || null })
    .returning();

  return NextResponse.json(conversation);
}
