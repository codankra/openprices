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
  GRAM = "g",
  KILOGRAM = "kg",
  MILLILITER = "ml",
  LITER = "l",
  OUNCE = "oz",
  POUND = "lb",
  FLUID_OUNCE = "fl oz",
  PINT = "pt",
  QUART = "qt",
  GALLON = "gal",
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
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
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

export const productBrands = sqliteTable(
  "ProductBrands",
  {
    name: text("name").primaryKey().notNull(),
    description: text("description"),
    isStoreOwner: integer("is_storeowner", { mode: "boolean" }).default(false),
    headquarters: text("headquarters"),
    website: text("website"),
    image: text("image"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameIdx: index("product_brands_name_idx").on(table.name),
  })
);
export const storeBrands = sqliteTable(
  "StoreBrands",
  {
    name: text("name").primaryKey().notNull(),
    description: text("description"),
    headquarters: text("headquarters"),
    website: text("website"),
    image: text("image"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameIdx: index("store_brands_name_idx").on(table.name),
  })
);

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
    receiptId: integer("receipt_id").references(() => receipts.id),
    verified: integer("verified", { mode: "boolean" }).default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    productIdIdx: index("price_entries_product_id_idx").on(table.productId),
    dateIdx: index("price_entries_date_idx").on(table.date),
    receiptIdIdx: index("price_entries_receipt_id_idx").on(table.receiptId),
    contributorIdx: index("price_entries_contributor_id_idx").on(
      table.contributorId
    ),
    verifiedIdx: index("price_entries_verified_idx").on(table.verified),
    createdAtIdx: index("price_entries_created_at_idx").on(table.createdAt),
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
    productStoreIdx: uniqueIndex("receipt_id_store_idx").on(
      table.receiptIdentifier,
      table.storeBrandName
    ),
  })
);

export const products = sqliteTable(
  "Products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    upc: text("upc").notNull(),
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
    contributedBy: text("contributed_by").references(() => users.id),
    active: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    upcIdx: index("upc_idx").on(table.upc),
    productBrandNameIdx: index("product_brand_name_idx").on(
      table.productBrandName
    ),
    productNameIdx: index("product_name_idx").on(table.name),
    contributedByIdx: index("product_contributed_by_idx").on(
      table.contributedBy
    ),
    createdAtIdx: index("product_created_at_idx").on(table.createdAt),
  })
);

export const receipts = sqliteTable(
  "Receipts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    storeBrandName: text("store_brand_name")
      .references(() => storeBrands.name)
      .notNull(),
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
    processedPriceEntries: integer("processed_price_entries"),
    processedMatchedItems: integer("processed_matched_items"),
    processedUnmatchedTxt: integer("processed_unmatched_txt"),
    processingErrors: text("processing_errors"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
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
    createdAtIdx: index("receipts_created_at_idx").on(table.createdAt),
  })
);
export const draftItems = sqliteTable(
  "DraftItems",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    receiptId: integer("receipt_id")
      .notNull()
      .references(() => receipts.id),
    productId: integer("product_id").references(() => products.id), //if matched
    receiptText: text("receipt_text").notNull(), // Original text from receipt
    price: real("price").notNull(),
    unitQuantity: real("unit_quantity"),
    unitPrice: real("unit_price"),
    minX: real("min_x").notNull().default(0),
    minY: real("min_y").notNull().default(0),
    maxX: real("max_x").notNull().default(0),
    maxY: real("max_y").notNull().default(0),
    status: text("status", {
      enum: ["pending", "matched", "completed", "ignored"],
    })
      .notNull()
      .default("pending"),
    isVisible: integer("is_visible", { mode: "boolean" })
      .notNull()
      .default(true),
    confidence: real("confidence"), // OCR confidence score
    notes: text("notes"), // For user annotations
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    receiptIdIdx: index("draft_items_receipt_id_idx").on(table.receiptId),
    statusIdx: index("draft_items_status_idx").on(table.status),
  })
);

export const requestedEdits = sqliteTable(
  "RequestedEdits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    productUpc: text("product_upc").notNull(),
    editType: text("edit_type").notNull(),
    editNotes: text("edit_notes").notNull(),
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by").references(() => users.id),
    reviewNotes: text("review_notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    statusIdx: index("idx_requested_edits_status").on(table.status),
    editTypeIdx: index("idx_requested_edits_type").on(table.editType),
    productUpcIdx: index("idx_requested_edits_upc").on(table.productUpc),
  })
);
