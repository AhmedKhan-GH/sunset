"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { patients, relatives } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { canDm } from "@/lib/dm/policy";

// Direct, raw SQL connection — used for the DM tables which intentionally
// live outside the Drizzle schema (per project convention for tables that
// rely on Postgres-only features like timestamptz / Realtime publications).
const sql = postgres(process.env.DATABASE_URL!);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return user;
}

function orderUserIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function isParticipant(threadId: string, userId: string): Promise<{
  ok: boolean;
  thread?: { id: string; user_a_id: string; user_b_id: string };
}> {
  const rows = await sql<
    Array<{ id: string; user_a_id: string; user_b_id: string }>
  >`
    select id, user_a_id, user_b_id
    from public.dm_threads
    where id = ${threadId}
    limit 1
  `;
  const thread = rows[0];
  if (!thread) return { ok: false };
  if (thread.user_a_id !== userId && thread.user_b_id !== userId) {
    return { ok: false, thread };
  }
  return { ok: true, thread };
}

export async function getOrCreateThread(
  otherUserId: string,
): Promise<{ threadId: string } | { error: string }> {
  const user = await requireUser();

  if (typeof otherUserId !== "string" || !otherUserId) {
    return { error: "invalid user id" };
  }
  if (otherUserId === user.id) {
    return { error: "cannot DM yourself" };
  }

  const decision = await canDm(user.id, otherUserId);
  if (!decision.allowed) {
    return { error: decision.reason };
  }

  const [userA, userB] = orderUserIds(user.id, otherUserId);

  const existing = await sql<Array<{ id: string }>>`
    select id from public.dm_threads
    where user_a_id = ${userA} and user_b_id = ${userB}
    limit 1
  `;
  if (existing[0]) {
    return { threadId: existing[0].id };
  }

  const inserted = await sql<Array<{ id: string }>>`
    insert into public.dm_threads (user_a_id, user_b_id)
    values (${userA}, ${userB})
    on conflict (user_a_id, user_b_id) do update
      set updated_at = public.dm_threads.updated_at
    returning id
  `;
  if (!inserted[0]) {
    return { error: "could not create thread" };
  }
  return { threadId: inserted[0].id };
}

export type DmThreadSummary = {
  threadId: string;
  otherUserId: string;
  otherDisplayName: string;
  lastMessage: string | null;
  updatedAt: string;
};

export async function listMyThreads(): Promise<DmThreadSummary[]> {
  const user = await requireUser();

  const threads = await sql<
    Array<{
      id: string;
      user_a_id: string;
      user_b_id: string;
      updated_at: string;
      last_message: string | null;
    }>
  >`
    select
      t.id,
      t.user_a_id,
      t.user_b_id,
      t.updated_at,
      (
        select content from public.dm_messages m
        where m.thread_id = t.id
        order by m.created_at desc
        limit 1
      ) as last_message
    from public.dm_threads t
    where t.user_a_id = ${user.id} or t.user_b_id = ${user.id}
    order by t.updated_at desc
  `;

  if (threads.length === 0) return [];

  const otherUserIds = threads.map((t) =>
    t.user_a_id === user.id ? t.user_b_id : t.user_a_id,
  );

  // Build a display-name lookup: prefer patients.name / relatives.name,
  // fall back to the auth user email, then to the userId itself.
  const nameById = new Map<string, string>();

  if (otherUserIds.length > 0) {
    const patientRows = await db
      .select({ userId: patients.userId, name: patients.name })
      .from(patients)
      .where(inArray(patients.userId, otherUserIds));
    for (const p of patientRows) {
      if (p.userId) nameById.set(p.userId, p.name);
    }

    const relativeRows = await db
      .select({ userId: relatives.userId, name: relatives.name })
      .from(relatives)
      .where(inArray(relatives.userId, otherUserIds));
    for (const r of relativeRows) {
      if (r.userId && !nameById.has(r.userId)) nameById.set(r.userId, r.name);
    }
  }

  // Fill remaining gaps with email/userId via the admin client.
  const missingIds = otherUserIds.filter((id) => !nameById.has(id));
  if (missingIds.length > 0) {
    try {
      const admin = createAdminClient();
      const {
        data: { users },
      } = await admin.auth.admin.listUsers();
      const userById = new Map(users.map((u) => [u.id, u]));
      for (const id of missingIds) {
        const u = userById.get(id);
        nameById.set(id, u?.email ?? id);
      }
    } catch {
      for (const id of missingIds) {
        if (!nameById.has(id)) nameById.set(id, id);
      }
    }
  }

  return threads.map((t) => {
    const otherUserId =
      t.user_a_id === user.id ? t.user_b_id : t.user_a_id;
    return {
      threadId: t.id,
      otherUserId,
      otherDisplayName: nameById.get(otherUserId) ?? otherUserId,
      lastMessage: t.last_message,
      updatedAt:
        typeof t.updated_at === "string"
          ? t.updated_at
          : new Date(t.updated_at).toISOString(),
    };
  });
}

export type DmMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
};

export async function listMessages(
  threadId: string,
  limit = 50,
): Promise<DmMessage[]> {
  const user = await requireUser();

  const { ok } = await isParticipant(threadId, user.id);
  if (!ok) return [];

  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));

  const rows = await sql<
    Array<{
      id: string;
      sender_id: string;
      content: string;
      created_at: string;
      read_at: string | null;
    }>
  >`
    select id, sender_id, content, created_at, read_at
    from public.dm_messages
    where thread_id = ${threadId}
    order by created_at asc
    limit ${safeLimit}
  `;

  return rows.map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    content: r.content,
    createdAt:
      typeof r.created_at === "string"
        ? r.created_at
        : new Date(r.created_at).toISOString(),
    readAt:
      r.read_at == null
        ? null
        : typeof r.read_at === "string"
          ? r.read_at
          : new Date(r.read_at).toISOString(),
  }));
}

export async function sendMessage(
  threadId: string,
  content: string,
): Promise<{ messageId: string } | { error: string }> {
  const user = await requireUser();

  if (typeof content !== "string" || !content.trim()) {
    return { error: "message is empty" };
  }

  const { ok } = await isParticipant(threadId, user.id);
  if (!ok) return { error: "not a participant" };

  const trimmed = content.trim();

  const inserted = await sql<Array<{ id: string }>>`
    insert into public.dm_messages (thread_id, sender_id, content)
    values (${threadId}, ${user.id}, ${trimmed})
    returning id
  `;
  if (!inserted[0]) return { error: "could not send message" };

  await sql`
    update public.dm_threads
    set updated_at = now()
    where id = ${threadId}
  `;

  return { messageId: inserted[0].id };
}

export async function markThreadRead(threadId: string): Promise<void> {
  const user = await requireUser();

  const { ok } = await isParticipant(threadId, user.id);
  if (!ok) return;

  await sql`
    update public.dm_messages
    set read_at = now()
    where thread_id = ${threadId}
      and sender_id <> ${user.id}
      and read_at is null
  `;
}
