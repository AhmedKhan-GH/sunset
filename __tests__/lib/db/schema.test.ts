import { describe, expect, it } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import { profiles } from "@/lib/db/schema";

describe("profiles table", () => {
  it("has the correct table name and columns", () => {
    expect(getTableName(profiles)).toBe("profiles");

    const columns = getTableColumns(profiles);
    expect(Object.keys(columns)).toEqual([
      "id",
      "email",
      "displayName",
      "createdAt",
      "updatedAt",
    ]);
  });
});
