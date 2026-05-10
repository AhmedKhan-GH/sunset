import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const { title } = await req.json();
  if (typeof title !== "string") {
    return NextResponse.json(null, { status: 400 });
  }

  const [updated] = await db
    .update(conversations)
    .set({ title })
    .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
    .returning();

  if (!updated) return NextResponse.json(null, { status: 404 });

  return NextResponse.json(updated);
}
