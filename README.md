# Brightloop ⚡

> Modern multi-tier customer portal with real-time billing, catalog ordering, and automated invoice lifecycle management.

---

## 🌐 Live Production Deployment

- **Live Application:** [https://maketon-brightloop-36dr-66kbcwrpc-pixel-f85e.vercel.app/](https://maketon-brightloop-36dr-66kbcwrpc-pixel-f85e.vercel.app/)

---

## 🔑 Demo & Evaluation Credentials

Judges can explore both Customer and Administrator permission flows immediately:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `gadhapramodsankar@gmail.com` | *(your set password)* | Inventory/item management, billing oversight, system audit |
| **Customer** | *(Self-register on site)* | *(User defined)* | Browse product catalog, manage subscriptions, checkout, view invoices |

> **Note:** Any evaluator can also instantly register a fresh personal account directly via the `/register` page.

---

## 🚀 Key Features & Capabilities

- **Role-Based Access Control (RBAC):** Distinct workflows for customers (purchasing, billing tracking) and administrators (catalog management, global invoice monitoring).
- **Automated Invoicing & Subscriptions:** Dynamic checkout flow converting product carts into generated invoice records and recurring tier management.
- **Resilient Cloud Persistence:** Zero-data-loss architecture backed by an autoscaling serverless PostgreSQL cluster.
- **Edge-Optimized Prerendering:** Next.js route segment caching combined with React `<Suspense>` boundary streaming for sub-second UI interactions.

---

## 🛠️ Architecture & Tech Stack

- **Framework:** Next.js (App Router, Server Actions, Turbopack)
- **Database Engine:** Neon Serverless PostgreSQL
- **Object-Relational Mapping (ORM):** Prisma ORM
- **UI & Styling:** Tailwind CSS, Lucide React
- **Cloud Infrastructure & Hosting:** Vercel Edge Network

---

## 💻 Local Setup & Reproduction

To run and inspect the repository locally:

```bash
# 1. Clone the repository
git clone [https://github.com/gadhapramodsankar-droid/maketon.brightloop.git](https://github.com/gadhapramodsankar-droid/maketon.brightloop.git)
cd maketon.brightloop

# 2. Install dependencies
npm install

# 3. Configure environment variables (create a .env file)
# DATABASE_URL="your_postgresql_connection_string"

# 4. Sync database schema & run the local dev server
npx prisma db push
npm run dev
Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
