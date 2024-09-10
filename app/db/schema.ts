import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(), // This will be a UUID
  email: text("email").notNull().unique(),
  name: text("name"),
  githubId: text("github_id").unique(),
  googleId: text("google_id").unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  defaultLocation: text("default_location"),
});

export const brands = sqliteTable("Brands", {
  name: text("name").primaryKey(),
  description: text("description"),
  headquarters: text("headquarters"),
  website: text("website"),
  image: text("image"),
});

export const products = sqliteTable("Products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  unitPricing: integer("unit_pricing", { mode: "boolean" }),
  latestPrice: real("latest_price"),
  receiptIdentifier: text("receipt_identifier"),
  quantity: real("quantity"),
  unitType: text("unit_type"),
  image: text("image"),
  brandName: text("brand_name").references(() => brands.name),
});

export const priceEntries = sqliteTable("PriceEntries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contributorId: integer("contributor_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  price: real("price").notNull(),
  date: text("date").notNull(),
  proof: text("proof"),
  storeLocation: text("store_location"),
});
