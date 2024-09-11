import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Define the UnitType enum
export enum UnitType {
  COUNT = "ct",
  // Metric units
  GRAM = "g",
  KILOGRAM = "kg",
  MILLILITER = "ml",
  LITER = "l",
  // Imperial units
  OUNCE = "oz",
  POUND = "lb",
  FLUID_OUNCE = "fl oz",
  GALLON = "g",
  // Additional units
  PIECE = "piece",
  PACKAGE = "pkg",
}

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

export const productBrands = sqliteTable("ProductBrands", {
  name: text("name").primaryKey(),
  description: text("description"),
  headquarters: text("headquarters"),
  website: text("website"),
  image: text("image"),
});
export const storeBrands = sqliteTable("StoreBrands", {
  name: text("name").primaryKey(),
  description: text("description"),
  headquarters: text("headquarters"),
  website: text("website"),
  image: text("image"),
});
export const products = sqliteTable("Products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  unitPricing: integer("is_unitpriced", { mode: "boolean" }),
  latestPrice: real("latest_price"),
  quantity: real("unit_qty"),
  category: text("category"),
  unitType: text("unit_type", {
    enum: Object.values(UnitType) as [string, ...string[]],
  }),
  image: text("image"),
  productBrandName: text("product_brand_name").references(
    () => productBrands.name
  ),
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

export const productReceiptIdentifiers = sqliteTable(
  "ProductReceiptIdentifiers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").references(() => products.id),
    storeBrandName: text("store_brand_name").references(() => storeBrands.name),
    receiptIdentifier: text("receipt_identifier").notNull(),
  }
);
