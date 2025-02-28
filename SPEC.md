# OpenPrices Implementation Specification

  

This document provides a comprehensive implementation specification for the **OpenPrices** project, a crowdsourced platform designed to track real-world prices of everyday products, with an initial focus on groceries and plans to expand to restaurant prices. The goal of this spec is to make the codebase more approachable, understandable, and maintainable for developers by outlining its architecture, key modules, data flows, and development practices.

  

---

## Overview

  

**OpenPrices** enables users to contribute price data through receipt uploads or manual price entries and provides a transparent record of current and historical prices. It leverages modern web technologies to deliver a seamless full-stack experience, integrating external services for image processing and storage, and is built with scalability and type safety in mind.

  

- **Live Site**: [openpricedata.com](https://openpricedata.com) or [cpipal.com](https://www.cpipal.com)
  
- **Repository**: [github.com/codankra/openprices](https://github.com/codankra/openprices)
  
- **License**: MIT (see LICENSE.md)
  

---

## Technology Stack

  

The application is a full-stack React-based web app with server-side capabilities, built using the following technologies:

  

### Frontend
- **React**: Core UI framework (react, react-dom)
- **React Router**: Routing and navigation (react-router, @react-router/node)
- **TypeScript**: Type safety and developer experience
- **Tailwind CSS**: Utility-first styling (tailwindcss)
- **Shadcn/UI**: Reusable UI components (@radix-ui/*)
- **Recharts**: Data visualization for price trends (recharts)
### Backend
- **Node.js**: Runtime environment
- **LibSQL**: SQLite-compatible database (@libsql/client)
- **Drizzle ORM**: Database schema and queries (drizzle-orm)
- **Remix Auth**: Authentication framework (remix-auth, remix-auth-oauth2, remix-auth-github)

### External Services
- **Google Vision**: Receipt text extraction (@google-cloud/vision, @google-cloud/vertexai)
- **Cloudflare R2**: Storage via AWS S3-compatible API (@aws-sdk/client-s3)
- **Fly.io**: Deployment platform (fly.toml, Dockerfile)
  
### Development Tools
- **Vite**: Build tool (vite, vite-tsconfig-paths)
- **ESLint**: Code linting (eslint, @typescript-eslint/*)
- **Docker**: Containerization (Dockerfile)
- **Cloudflare Tunnel**: Local development proxy (cloudflared.yml)

---

## Architecture
The codebase follows a clean architecture with separation of concerns:

- **Presentation Layer**: React components in app/components
- **Business Logic**: Services in app/services
- **Data Access**: Database interactions in app/db
- **Utilities**: Shared functions and types in app/lib

The application uses React Router with file-based routing and supports server-side rendering (SSR) capabilities via entry.server.tsx. It adheres to TypeScript strict mode for robust type checking.

### Directory Structure

├── app                    # Core application code
│   ├── components        # React components
│   │   ├── custom        # Custom UI components
│   │   └── ui            # Shadcn/UI components
│   ├── db                # Database schema and utilities
│   ├── lib               # Shared utilities and parsers
│   ├── routes            # File-based routes
│   ├── services          # Backend services
│   ├── entry.client.tsx  # Client-side entry point
│   ├── entry.server.tsx  # Server-side entry point
│   └── root.tsx          # Root component
├── public                # Static assets
├── Dockerfile            # Docker configuration
├── fly.toml              # Fly.io deployment config
├── package.json          # Dependencies and scripts
└── tailwind.config.ts    # Tailwind CSS configuration

## Key Modules

Below are the primary modules of the OpenPrices application, their responsibilities, and key files.
### 1. Authentication Module

- **Purpose**: Manages user authentication via Google and GitHub OAuth.
- **Key Files**:  
    - app/lib/auth/GoogleStrategy.ts: Google OAuth strategy
    - app/services/auth.server.ts: Authentication logic
    - app/services/user.server.ts: User management
- **Dependencies**: remix-auth, remix-auth-oauth2, remix-auth-github
- **Data**: Stores user info in the users table (app/db/schema.ts)
  

### 2. Database Module

- **Purpose**: Handles data persistence and caching.
- **Key Files**:  
    - app/db/schema.ts: Defines tables (e.g., users, products, priceEntries, receipts, draftItems)
    - app/db/index.ts: Database connection
    - app/db/cache.ts: Caching layer
- **Dependencies**: drizzle-orm, @libsql/client
- **Backend**: LibSQL (SQLite-compatible, likely Turso)
  

### 3. Routing Module

- **Purpose**: Defines navigation and page rendering.
- **Key Files**:  
    - app/routes.ts: Route definitions
    - app/routes/*: File-based routes (e.g., _index.tsx, upload-receipt.tsx)
    - app/entry.client.tsx: Client-side routing entry
    - app/entry.server.tsx: Server-side routing entry
- **Dependencies**: react-router, @react-router/node

### 4. UI Components Module
- **Purpose**: Provides reusable UI elements.
- **Key Files**:  
    - app/components/custom/*: Custom components (e.g., PriceEntryChart.tsx, HeaderLinks.tsx)
    - app/components/ui/*: Shadcn/UI components (e.g., button.tsx, card.tsx)
- **Dependencies**: @radix-ui/*, tailwindcss, recharts
  

### 5. Receipt Processing Module
- **Purpose**: Processes uploaded receipt images to extract price data.
- **Key Files**:  
    - app/services/vision.server.ts: Google Vision integration
    - app/lib/parsers/*: Store-specific parsers (e.g., tj.ts, heb.ts)
    - app/services/receipt.server.ts: Receipt handling logic
- **Flow**:  
    1. Upload receipt image (upload-receipt.tsx)
    2. Store in Cloudflare R2 (r2.server.ts)
    3. Extract text with Google Vision
    4. Parse text to identify items
    5. Create draftItems for verification

### 6. Product Management Module
- **Purpose**: Manages product data and price entries.
- **Key Files**:  
    - app/services/product.server.ts: Product CRUD operations
    - app/services/price.server.ts: Price entry handling
    - app/routes/product.$id.tsx: Product detail page
- **Features**: Search, create, and view products with price history (PriceEntryChart.tsx)
  

### 7. User Contributions Module
- **Purpose**: Tracks and displays user-submitted data.
- **Key Files**:  
    - app/routes/account.tsx: User account page
    - app/components/custom/receipt/ContributionHistory.tsx: Contribution display
    - app/services/user.server.ts: Contribution queries

### 8. Background Jobs Module
- **Purpose**: Handles asynchronous tasks (e.g., receipt processing).
- **Key Files**:  
    - app/services/job.server.ts: Job queue management
- **Dependencies**: Custom queue implementation (app/lib/structs/queue.ts)

### 9. External Services Module
- **Purpose**: Integrates with third-party services.
- **Key Files**:  
    - app/services/r2.server.ts: Cloudflare R2 storage
    - app/services/vision.server.ts: Google Vision API
    - app/services/rateLimiter.service.ts: API rate limiting
    
---
## Key Flows

### 1. User Authentication
- **Steps**:  
    1. User logs in via Google/GitHub (auth.tsx, login.tsx)
    2. Redirect to callback route (auth.callback.tsx)
    3. Create or update user in users table (user.server.ts)
    4. Store session
 
### 2. Receipt Upload
- **Steps**:  
    1. User uploads receipt (upload-receipt.tsx)
    2. Image stored in R2 (r2.server.ts)
    3. Text extracted via Google Vision (vision.server.ts)
    4. Parsed using store-specific logic (tj.ts, heb.ts)
    5. Items saved as draftItems or priceEntries (receipt.server.ts)
- **Outcome**: Processed items linked to receipts table

### 3. Manual Price Entry
- **Steps**:  
    1. User searches or creates a product (price-entry.tsx)
    2. Enters price details
    3. Data saved to priceEntries table (price.server.ts)

### 4. Product Viewing
- **Steps**:  
    1. User searches for products (search.tsx)
    2. Views product details (product.$id.tsx)
    3. Displays price history with charts (PriceEntryChart.tsx)

---

## Data Model
The database schema (app/db/schema.ts) includes the following key tables:

- **users**: Stores user information (ID, email, name, provider IDs)
- **products**: Product details (ID, name, UPC, unit type)
- **priceEntries**: Price records (product ID, price, date, contributor ID)
- **receipts**: Receipt metadata (ID, user ID, image URL, total amount)
- **draftItems**: Temporary items for verification (receipt ID, product ID, status)

Relationships:
- users ↔ priceEntries (contributor)
- users ↔ receipts (uploader)
- products ↔ priceEntries (price tracking)
- receipts ↔ draftItems (pending items)
---

## Best Practices
- **TypeScript**: Use strict mode and proper type annotations
- **Components**: Follow Shadcn/UI patterns
- **Styling**: Use Tailwind CSS exclusively
- **Imports**: Use ~/ path aliases (e.g., ~/lib/utils)
- **Error Handling**: Implement discriminated unions for errors
- **Naming**: PascalCase for components, camelCase for variables/functions
- **State Management**: Prefer React hooks and context
---

## Deployment
- **Platform**: Fly.io
- **Process**:  
    1. Build Docker image (Dockerfile)
    2. Deploy via GitHub Actions (fly-deploy.yml)
- **Config**: fly.toml specifies app settings (e.g., port 3000, 512MB memory)
---

## Getting Started as a Developer
To work effectively with this codebase:
1. **Learn the Basics**:  
    - Understand React and React Router
    - Familiarize yourself with TypeScript and Tailwind CSS
2. **Explore Key Areas**:  
    - Study the database schema (schema.ts)
    - Review authentication flow (auth.server.ts)
    - Trace the receipt processing pipeline (vision.server.ts, receipt.server.ts)
3. **Set Up Locally**:  
    - Follow the development setup steps
    - Use npm run lint and npm run typecheck to ensure code quality
4. **Contribute**:  
    - Follow patterns in existing code
    - AI Agents: Refer to CLAUDE.md for guidelines
    - Submit pull requests with clear descriptions
---
