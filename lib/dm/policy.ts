import { db } from "@/lib/db";
import { profiles, practitioners, patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type CanDmResult =
  | { allowed: true }
  | { allowed: false; reason: string };

type DmRole = "practitioner" | "patient" | "relative";

const ALLOWED_ROLES: ReadonlyArray<DmRole> = [
  "practitioner",
  "patient",
  "relative",
];

function isDmRole(role: string | null | undefined): role is DmRole {
  return !!role && (ALLOWED_ROLES as ReadonlyArray<string>).includes(role);
}

/**
 * canDm
 *
 * Returns whether two users are allowed to direct-message each other based
 * on the platform's relationship rules:
 *
 *   - practitioner <-> patient: same organization
 *   - practitioner <-> relative: relative is linked to a patient in the
 *                                practitioner's organization
 *   - patient      <-> relative: relative.patientId == patient(by user_id).id
 *
 * Any other role pair (including any admin role) is rejected.
 *
 * Same-user pairs are rejected. Order of arguments does not matter.
 */
export async function canDm(
  userIdA: string,
  userIdB: string,
): Promise<CanDmResult> {
  if (!userIdA || !userIdB) {
    return { allowed: false, reason: "missing user id" };
  }
  if (userIdA === userIdB) {
    return { allowed: false, reason: "cannot DM yourself" };
  }

  const [profileA] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userIdA));
  const [profileB] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userIdB));

  if (!profileA || !profileB) {
    return { allowed: false, reason: "profile not found" };
  }
  if (!isDmRole(profileA.role) || !isDmRole(profileB.role)) {
    return { allowed: false, reason: "role not eligible for DMs" };
  }

  // Normalize the pair so we only have to handle three cases below.
  const ranked: Record<DmRole, number> = {
    practitioner: 0,
    patient: 1,
    relative: 2,
  };
  const [first, second] =
    ranked[profileA.role] <= ranked[profileB.role]
      ? [
          { userId: userIdA, role: profileA.role as DmRole },
          { userId: userIdB, role: profileB.role as DmRole },
        ]
      : [
          { userId: userIdB, role: profileB.role as DmRole },
          { userId: userIdA, role: profileA.role as DmRole },
        ];

  // practitioner <-> patient
  if (first.role === "practitioner" && second.role === "patient") {
    const [practitioner] = await db
      .select()
      .from(practitioners)
      .where(eq(practitioners.userId, first.userId));
    if (!practitioner) {
      return { allowed: false, reason: "practitioner record not found" };
    }
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, second.userId));
    if (!patient) {
      return { allowed: false, reason: "patient record not found" };
    }
    if (patient.organizationId !== practitioner.organizationId) {
      return {
        allowed: false,
        reason: "patient is not in practitioner's organization",
      };
    }
    return { allowed: true };
  }

  // practitioner <-> relative
  if (first.role === "practitioner" && second.role === "relative") {
    const [practitioner] = await db
      .select()
      .from(practitioners)
      .where(eq(practitioners.userId, first.userId));
    if (!practitioner) {
      return { allowed: false, reason: "practitioner record not found" };
    }
    const [relative] = await db
      .select()
      .from(relatives)
      .where(eq(relatives.userId, second.userId));
    if (!relative) {
      return { allowed: false, reason: "relative record not found" };
    }
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, relative.patientId));
    if (!patient) {
      return { allowed: false, reason: "linked patient not found" };
    }
    if (patient.organizationId !== practitioner.organizationId) {
      return {
        allowed: false,
        reason: "relative's patient is not in practitioner's organization",
      };
    }
    return { allowed: true };
  }

  // patient <-> relative
  if (first.role === "patient" && second.role === "relative") {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, first.userId));
    if (!patient) {
      return { allowed: false, reason: "patient record not found" };
    }
    const [relative] = await db
      .select()
      .from(relatives)
      .where(eq(relatives.userId, second.userId));
    if (!relative) {
      return { allowed: false, reason: "relative record not found" };
    }
    if (relative.patientId !== patient.id) {
      return {
        allowed: false,
        reason: "relative is not linked to this patient",
      };
    }
    return { allowed: true };
  }

  // Any other combo (including same-role pairs) is not allowed in v1.
  return { allowed: false, reason: "role pair not allowed" };
}
