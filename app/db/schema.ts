import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
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
  GALLON = "gal",
  // Additional units
  PIECE = "piece",
  PACKAGE = "pkg",
}

export const users = sqliteTable(
  "users",
  {
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
  },
  (table) => {
    return {
      emailUnique: uniqueIndex("users_email_unique").on(table.email),
    };
  }
);

export const productBrands = sqliteTable("ProductBrands", {
  name: text("name").primaryKey().notNull(),
  description: text("description"),
  isStoreOwner: integer("is_storeowner", { mode: "boolean" }),
  headquarters: text("headquarters"),
  website: text("website"),
  image: text("image"),
});
export const storeBrands = sqliteTable("StoreBrands", {
  name: text("name").primaryKey().notNull(),
  description: text("description"),
  headquarters: text("headquarters"),
  website: text("website"),
  image: text("image"),
});

export const priceEntries = sqliteTable(
  "PriceEntries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    contributorId: text("contributor_id").references(() => users.id),
    productId: integer("product_id").references(() => products.id),
    price: real("price").notNull(),
    date: text("date").notNull(),
    proof: text("proof"),
    storeLocation: text("store_location"),
    entrySource: text("entry_source", {
      enum: ["manual", "receipt"],
    })
      .notNull()
      .default("manual"),
    receiptId: integer("receipt_id").references(
      () => productReceiptIdentifiers.id
    ),
  },
  (table) => ({
    productIdIdx: index("price_entries_product_id_idx").on(table.productId),
    dateIdx: index("price_entries_date_idx").on(table.date),
    receiptIdIdx: index("price_entries_receipt_id_idx").on(table.receiptId),
    contributorIdx: index("price_entries_contributor_id_idx").on(
      table.contributorId
    ),
  })
);

export const productReceiptIdentifiers = sqliteTable(
  "ProductReceiptIdentifiers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").references(() => products.id),
    storeBrandName: text("store_brand_name").references(() => storeBrands.name),
    receiptIdentifier: text("receipt_identifier").notNull(),
  },
  (table) => ({
    productIdIdx: index("product_receipt_id_idx").on(table.productId),
    storeBrandsIdx: index("store_brands_idx").on(table.storeBrandName),
  })
);

export const products = sqliteTable(
  "Products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    name: text("name").notNull(),
    category: text("category"),
    latestPrice: real("latest_price"),
    unitPricing: integer("is_unitpriced", { mode: "boolean" }),
    unitQty: real("unit_qty"),
    unitType: text("unit_type", {
      enum: Object.values(UnitType) as [string, ...string[]],
    }),
    image: text("image"),
    productBrandName: text("product_brand_name").references(
      () => productBrands.name
    ),
  },
  (table) => ({
    productBrandNameIdx: index("product_brand_name_idx").on(
      table.productBrandName
    ),
    productNameIdx: index("product_name_idx").on(table.name),
  })
);

export const receipts = sqliteTable(
  "Receipts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    storeBrandName: text("store_brand_name").references(() => storeBrands.name),
    storeLocation: text("store_location"),
    purchaseDate: text("purchase_date").notNull(),
    totalAmount: real("total_amount"),
    taxAmount: real("tax_amount"),
    imageUrl: text("image_url").notNull(), // Cloudflare URL
    rawOcrText: text("raw_ocr_text"), // Full OCR text for reference
    status: text("status", {
      enum: ["pending", "processed", "completed", "error"],
    })
      .notNull()
      .default("pending"),
    processingErrors: text("processing_errors"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("receipts_user_id_idx").on(table.userId),
    dateIdx: index("receipts_date_idx").on(table.purchaseDate),
    statusIdx: index("receipts_status_idx").on(table.status),
    storeBrandNameIdx: index("receipts_store_brand_name_idx").on(
      table.storeBrandName
    ),
  })
);

export const draftItems = sqliteTable(
  "DraftItems",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    receiptId: integer("receipt_id")
      .notNull()
      .references(() => receipts.id),
    receiptText: text("receipt_text").notNull(), // Original text from receipt
    price: real("price").notNull(),
    unitQuantity: real("unit_quantity"),
    unitPrice: real("unit_price"),
    status: text("status", {
      enum: ["pending", "matched", "created", "ignored"],
    })
      .notNull()
      .default("pending"),
    confidence: real("confidence"), // OCR confidence score
    notes: text("notes"), // For user annotations
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    receiptIdIdx: index("draft_items_receipt_id_idx").on(table.receiptId),
    statusIdx: index("draft_items_status_idx").on(table.status),
  })
);
