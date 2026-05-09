import { describe, expect, it } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import { profiles } from "@/lib/db/schema";

describe("Database schema", () => {
  describe("profiles table", () => {
    it("is named 'profiles'", () => {
      expect(getTableName(profiles)).toBe("profiles");
    });

    it("has all expected columns", () => {
      const columns = getTableColumns(profiles);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("email");
      expect(columnNames).toContain("displayName");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("has exactly 5 columns", () => {
      const columns = getTableColumns(profiles);
      expect(Object.keys(columns)).toHaveLength(5);
    });

    describe("id column", () => {
      it("is a UUID primary key with default", () => {
        const columns = getTableColumns(profiles);
        const id = columns.id as Record<string, unknown>;
        expect(id.dataType).toBe("string");
        expect(id.columnType).toBe("PgUUID");
        expect(id.primary).toBe(true);
        expect(id.hasDefault).toBe(true);
      });
    });

    describe("email column", () => {
      it("is a non-nullable unique text field", () => {
        const columns = getTableColumns(profiles);
        expect(columns.email.dataType).toBe("string");
        expect(columns.email.notNull).toBe(true);
        expect(columns.email.isUnique).toBe(true);
      });
    });

    describe("displayName column", () => {
      it("is a nullable text field", () => {
        const columns = getTableColumns(profiles);
        expect(columns.displayName.dataType).toBe("string");
        expect(columns.displayName.notNull).toBe(false);
      });

      it("maps to the display_name database column", () => {
        const columns = getTableColumns(profiles);
        expect(columns.displayName.name).toBe("display_name");
      });
    });

    describe("createdAt column", () => {
      it("is a non-nullable timestamp with default", () => {
        const columns = getTableColumns(profiles);
        expect(columns.createdAt.notNull).toBe(true);
        expect(columns.createdAt.hasDefault).toBe(true);
        expect(columns.createdAt.columnType).toBe("PgTimestamp");
      });

      it("maps to the created_at database column", () => {
        const columns = getTableColumns(profiles);
        expect(columns.createdAt.name).toBe("created_at");
      });
    });

    describe("updatedAt column", () => {
      it("is a non-nullable timestamp with default", () => {
        const columns = getTableColumns(profiles);
        expect(columns.updatedAt.notNull).toBe(true);
        expect(columns.updatedAt.hasDefault).toBe(true);
        expect(columns.updatedAt.columnType).toBe("PgTimestamp");
      });

      it("maps to the updated_at database column", () => {
        const columns = getTableColumns(profiles);
        expect(columns.updatedAt.name).toBe("updated_at");
      });
    });
  });
});
