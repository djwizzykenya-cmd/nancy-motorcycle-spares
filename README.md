# Nancy Motorcycle Spares - E-Commerce Marketplace

A full-stack e-commerce platform similar to Kilimall/Jumia, built specifically for selling motorcycle spares in Kenya.

## Project Structure

This is a monorepo with multiple services:

```
nancy-motorcycle-spares/
├── backend/          # Express.js API server with TypeScript
├── web/              # Next.js storefront and admin platform
├── mobile/           # React Native mobile app
├── shared/           # Shared TypeScript types and utilities
├── .github/          # GitHub configurations
├── .env.example      # Environment variables template
├── package.json      # Root package.json with workspaces
└── README.md         # This file
```

## Tech Stack

### Backend
- **Runtime**: Node.js 20.9+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (with Prisma ORM)
- **Cache**: Redis
- **Auth**: JWT
- **Payments**: Cash on delivery only; M-Pesa and card payments are not enabled

### Web Platform
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State Management**: Context API + Zustand (optional)
- **Deployment**: Vercel

### Mobile App
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation
- **Storage**: AsyncStorage
- **Deployment**: TestFlight + Google Play Console

### Shared
- TypeScript type definitions
- Constants and enums
- Utility functions

## Getting Started

### Prerequisites
- Node.js 20.9+ and npm
- PostgreSQL 12+
- Redis (optional for development)
- Git

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd nancy-motorcycle-spares
```

2. Install dependencies for all workspaces
```bash
npm install
```

Keep the root, `web`, and `backend` npm lockfiles committed so deployments install the audited dependency versions.

3. Set up environment variables
```bash
cp .env.example .env.local
# Update .env.local with your configuration
```

4. Set up the database
```bash
cd backend
npm run db:migrate
cd ..
```

### Development

Start all services in development mode:
```bash
npm run dev
```

Or run services individually:

**Backend**
```bash
cd backend
npm run dev
```

**Web**
```bash
cd web
npm run dev
```

**Mobile**
```bash
cd mobile
npm run dev
```

### Building

Build all services:
```bash
npm run build
```

### Testing

Run tests across all workspaces:
```bash
npm run test
```

## Features

### Phase 1 (MVP - Weeks 1-4)
- ✅ Product catalog with search & filters
- ✅ Single-seller storefront managed by the Nancy Motorcycle Spares admin
- ✅ Shopping cart & checkout
- ✅ Customer order history with status-based tracking and delivery destination maps, plus admin-managed courier references
- ✅ Customer registration and admin authentication
- ✅ Admin product and order management; user activity (sign-in and order history) and permanent customer-account deletion
- ✅ Reviews & ratings
- ✅ Wishlist
- ✅ Cash-on-delivery checkout
- ⏳ M-Pesa integration (not enabled in the live checkout)
- 🚫 Card payments (excluded from the product scope)

### Phase 2 (Post-MVP)
- 🔜 Delivery tracking with logistics integration
- 🔜 Advanced analytics
- 🔜 AI-powered recommendations
- 🔜 Live chat & customer support
- 🔜 Multi-currency support

## API Documentation

Full API documentation available at `/docs` once backend is running.

## Deployment

- **Backend**: Docker container on AWS ECS, DigitalOcean, or Railway
- **Web**: Vercel
- **Mobile**: TestFlight (iOS) + Google Play Console (Android)
- **Database**: AWS RDS PostgreSQL
- **Cache**: Redis Cloud

### Vercel Web Deployment

Import the Nancy Motorcycle Spares GitHub repository into Vercel and set the project **Root Directory** to `web`. Vercel detects Next.js and builds the storefront from that directory. Git pushes to the connected repository deploy updates automatically, and Vercel provides a free `vercel.app` address.

The current site has no backend or live product database. In production, demo authentication, sample products, and simulated API responses are disabled; until a real API is connected, catalog, account, and checkout actions will not work. Do not accept orders until the backend and database are deployed, real inventory and prices are loaded, and a test order has been verified end to end. A custom domain is not required for setup or testing; the assigned `vercel.app` URL can be used first. Vercel's free Hobby plan is for personal, non-commercial use, so select a plan suitable for commercial operation before opening the store to customers.

When the backend is deployed, set `NEXT_PUBLIC_API_URL` in Vercel to its public API URL (for example, `https://api.your-domain.com/api`) and redeploy. Keep backend secrets out of Vercel; configure them only on the backend host.

### Railway Deployment (Backend)

The `.railway/railway.ts` configuration manages the Express API service. Deploy the repository root so the backend can build its local `shared` package:

- Build command: `npm install --prefix backend --no-audit --no-fund && npm run build --prefix backend`
- Pre-deploy command: `npm run db:deploy --prefix backend`
- Start command: `npm start --prefix backend`
- Health check: `/api/health`

Set `DATABASE_URL` to the production PostgreSQL connection string, `JWT_SECRET` to a strong private secret, and `NODE_ENV=production` in Railway. Railway supplies `PORT`; the backend uses it automatically. Apply the committed Prisma migrations with the pre-deploy command before the service starts.

#### Payment scope

Cash on delivery is the only payment method currently enabled in the live checkout. M-Pesa is not configured or available to customers, and card payments are excluded from the product scope. Do not configure or expose payment-gateway credentials in Vercel; if M-Pesa is approved for a future release, document and deploy it as a separate backend integration.

Nancy Motorcycle Spares is the only active seller. Public registration creates customer accounts only; seller sign-in, uploads, and product-management access are disabled. The admin account owns the store profile and product catalog. The admin-only-seller migration transfers catalog products to that profile and deactivates legacy seller logins without deleting seller or order records, preserving historical order references.

Customer carts are saved to the signed-in customer's account in PostgreSQL and sync across devices. A guest cart is merged into the account cart after sign-in; cart contents remain cached locally for offline browsing.

Product reviews are public on product detail pages, but only signed-in customers with a delivered order containing that product can create or update a review. A customer may keep one review per product; the API validates ratings and updates the product's rating summary in the same database transaction.

Signed-in customers can save active products to a personal wishlist from product cards or product detail pages. Wishlist entries are stored in PostgreSQL and can be viewed or removed from the customer's wishlist page.

Admin access uses a private production account, not a shared frontend password. To reset it, add `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` (at least 12 characters) as private Railway variables, then run `npm run db:admin:setup --prefix backend` from the Railway service shell. The script hashes the password and updates or creates that admin account. Never put the password in the frontend, source control, or chat. For local development, set the same variables in `backend/.env` and run `npm run db:admin:setup --prefix backend`. The `admin@nancy.test` / `adminpass` demo credentials are for local fallback testing only and are not a production login.

In the Vercel project, set `NEXT_PUBLIC_API_URL` to the Railway public origin followed by `/api` (for example, `https://your-backend.up.railway.app/api`), then redeploy the frontend.

#### Product image storage

Product image uploads use the authenticated `POST /api/uploads/images` endpoint and an S3-compatible object store. The API accepts up to five JPEG, PNG, WebP, or GIF images per request, with a 5 MB limit per image. It validates image signatures, uploads objects, and returns public URLs for product records; binary files are not stored in PostgreSQL or sent as Base64 JSON.

Create a dedicated Supabase project and product-images bucket for Nancy Motorcycle Spares. Do not reuse another store's Supabase project, bucket, database, or credentials. Enable its S3-compatible endpoint and limit uploads to 5 MB and JPEG, PNG, WebP, or GIF. Public read access is required so storefront visitors can see product images; writes still go through the authenticated backend.

Create an S3 access key in the Supabase project under **Storage → S3**. Supabase S3 keys have broad storage access and bypass bucket RLS, so keep them on the server only. Set these variables in the backend's ignored `backend/.env` for local development and on the backend service in Railway:

- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` — Supabase S3 access key pair; these keys have broad access to project storage.
- `AWS_REGION=eu-west-1` — the region shown in Supabase's S3 configuration.
- `AWS_S3_BUCKET=nancy-motorcycle-spares-product-images`.
- `AWS_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3`.
- `AWS_PUBLIC_BASE_URL=https://<project-ref>.supabase.co/storage/v1/object/public/nancy-motorcycle-spares-product-images`.

The Supabase Free plan includes 1 GB of file storage and 5 GB of egress; free projects may pause after a week of inactivity. Check [current Supabase limits and pricing](https://supabase.com/pricing) before production traffic grows. Keep the S3 access key and secret out of Vercel and source control; only the backend needs them.

### GitHub Actions (CI)

This repository includes a GitHub Actions workflow to build the `web` app:

- `.github/workflows/web-ci.yml` — runs `npm run build --prefix web` on pushes and PRs to `main`/`master`.

Vercel deploys through its GitHub integration when changes are pushed to the connected repository; no Vercel token is needed in GitHub Actions.


## Contributing

See CONTRIBUTING.md for guidelines.

## License

MIT

## Contact

Add Nancy Motorcycle Spares' real support email and phone number before launch.
