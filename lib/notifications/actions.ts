"use server";

import postgres from "postgres";
import { createClient } from "@/lib/supabase/server";

const sql = postgres(process.env.DATABASE_URL!);

export type InboxNotification = {
  id: string;
  sender_label: string;
  title: string;
  body: string;
  urgency: "low" | "normal" | "high" | "urgent";
  patient_id: string | null;
  read_at: string | null;
  created_at: string;
};

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listMyNotifications(
  limit = 20,
): Promise<InboxNotification[]> {
  const userId = await requireUserId();
  if (!userId) return [];

  const cap = Math.min(Math.max(limit, 1), 100);

  const rows = await sql`
    select id, sender_label, title, body, urgency, patient_id, read_at, created_at
    from public.notifications
    where recipient_id = ${userId}
    order by created_at desc
    limit ${cap}
  `;

  return rows.map((r) => ({
    id: r.id as string,
    sender_label: r.sender_label as string,
    title: r.title as string,
    body: r.body as string,
    urgency: r.urgency as InboxNotification["urgency"],
    patient_id: (r.patient_id as string | null) ?? null,
    read_at: r.read_at ? new Date(r.read_at as string).toISOString() : null,
    created_at: new Date(r.created_at as string).toISOString(),
  }));
}

export async function getUnreadCount(): Promise<number> {
  const userId = await requireUserId();
  if (!userId) return 0;

  const rows = await sql`
    select count(*)::int as count
    from public.notifications
    where recipient_id = ${userId} and read_at is null
  `;
  return (rows[0]?.count as number) ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  await sql`
    update public.notifications
       set read_at = now()
     where id = ${notificationId}
       and recipient_id = ${userId}
       and read_at is null
  `;
}

export async function markAllAsRead(): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  await sql`
    update public.notifications
       set read_at = now()
     where recipient_id = ${userId}
       and read_at is null
  `;
}
