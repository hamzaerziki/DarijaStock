# MASTER BUILD PROMPT — DarijaStock

Act as a senior full-stack engineer, software architect, database engineer, UI/UX designer and application security engineer.

Your task is to build DarijaStock, a real, production-minded web application for order management, inventory control and invoicing for a Moroccan business.

## 1. READ THE PROJECT DOCUMENTATION FIRST

Before writing code, read these files:

- README.md
- project-spec.json

Treat them as the source of truth for the business requirements, architecture, design, security and acceptance criteria.

If the repository already contains code, inspect it before modifying anything. Preserve working features and configuration unless a change is justified.

## 2. PRODUCT VISION

Employees receive customer orders through WhatsApp. They must be able to copy messages and paste them into the application without using the WhatsApp API or paid OCR.

The application must also support manual order creation and a separate web form for customers to submit orders.

The system must help employees:

- Understand incoming orders.
- Match product names against the real catalog.
- Validate quantities, units and prices.
- Review multiple orders in batches.
- Manage physical stock and reservations.
- Generate and track invoices.
- Work simultaneously with appropriate permissions.

The employee-facing interface must use natural Moroccan Darija, with Arabic RTL support and readable French and Latin product references.

## 3. DESIGN THE APPLICATION BEFORE IMPLEMENTING IT

Create a consistent, professional business SaaS interface.

Visual direction:

- Light theme.
- Dark navy sidebar.
- White and light-gray content areas.
- Restrained teal accent color.
- Clear typography and readable data tables.
- Consistent spacing, buttons, forms and status indicators.
- Responsive layout for desktop, tablet and mobile.
- Arabic RTL support wherever required.
- Accessible contrast and keyboard navigation.

Create these main navigation sections:

1. الرئيسية
2. الكوموندات
3. استيراد الميساجات
4. المنتوجات
5. الستوك
6. الزبناء
7. الفواتير
8. التقارير
9. المستخدمين والإعدادات

### Required screens

A. Dashboard
- Order summaries.
- Stock alerts.
- Recent stock movements.
- Invoice activity.
- Date-filtered reporting.

B. WhatsApp Import
- Large text-paste area.
- Batch import option.
- Original message preview.
- Parsing status.
- Product matching results.
- Missing-information warnings.
- Clear action to review extracted orders.

C. Batch Review
- Table of imported orders.
- Ready and exception states.
- Inline editing.
- Duplicate warnings.
- Filters and search.
- Authorized approval actions.

D. Inventory
- Searchable product table.
- Physical, reserved and available quantities.
- Receive-stock and dispatch-stock actions.
- Unit and conversion management.
- Movement history.
- Low-stock alerts.

E. Product Catalog
- SKU and product name.
- Darija, Arabic and French aliases.
- Units.
- Approved prices.
- Tax category.
- Active status.

F. Order Management
- Manual order creation.
- Order details and line items.
- Customer assignment.
- Status history.
- Validation and approval.

G. Invoices
- Invoice list.
- Draft and issued states.
- PDF preview.
- Invoice details and history.
- Controlled correction and cancellation workflows.

H. Customers and Users
- Customer profiles and order history.
- User accounts, roles and permissions.

Do not create disconnected mockup screens. Every implemented screen must be connected to its real backend functionality unless explicitly labeled as a prototype.

## 4. TECHNICAL ARCHITECTURE

Use the stack defined in project-spec.json:

Frontend:
React, TypeScript, Vite, Tailwind CSS and shadcn/ui.

Backend:
Python, FastAPI, Pydantic and SQLAlchemy.

Database:
PostgreSQL with Alembic migrations.

PDF generation:
HTML templates rendered with WeasyPrint or a tested alternative.

Deployment:
Docker Compose.

Add Celery and Redis only when background-processing requirements justify them.

Use a modular monolith. Keep business logic, API routes, database access and UI components separated.

## 5. IMPLEMENTATION RULES

Work incrementally.

For each phase:

1. Explain what will be built.
2. Inspect existing files and dependencies.
3. Implement the feature.
4. Add or update database migrations.
5. Connect frontend and backend.
6. Add tests for the important behavior.
7. Run the available checks.
8. Fix failures before moving on.
9. Update README.md with the implemented functionality and setup instructions.

Do not claim that tests passed unless you actually ran them.

Do not generate the entire system in one enormous file.

Do not use hardcoded arrays as substitutes for database-backed business records.

Do not leave core buttons without working actions.

Do not silently skip failed operations.

## 6. BUSINESS RULES THAT MUST NEVER BE BYPASSED

- AI may extract information but cannot authorize stock movements or invoice issuance.
- Never invent missing customer information, product identity, prices or quantities.
- Preserve the original imported message.
- Perform financial calculations on the backend using Decimal arithmetic.
- Keep physical stock separate from reserved stock.
- Draft orders must not automatically deduct physical inventory.
- Use transactions and concurrency-safe controls for stock reservations and dispatches.
- Use idempotency controls for operations that may be retried.
- Prevent unauthorized negative stock.
- Do not silently modify issued invoices or historical stock movements.
- Enforce user permissions on the backend.
- Preserve audit history for sensitive operations.
- Require human review when product matching or order interpretation is ambiguous.

## 7. PHASE 1 — START NOW

Do not attempt to implement every module immediately.

Begin with the following deliverables:

1. Inspect the current repository.
2. Produce the proposed directory structure.
3. Identify dependencies and required environment variables.
4. Create the initial frontend and backend projects.
5. Configure PostgreSQL and Docker Compose.
6. Add database migrations.
7. Implement the initial user model and secure authentication.
8. Implement role-based backend authorization.
9. Create the main application shell and Darija navigation.
10. Implement real product and customer management.
11. Add initial automated tests.
12. Document how to run the application locally.

If no repository exists, create a clean, maintainable project structure.

If an essential decision is missing, state your assumption and ask only when proceeding could create a material security, financial or architectural problem.

## 8. PHASE 2 — INVENTORY

After Phase 1 passes its checks:

- Implement product units and conversion rules.
- Implement stock receipts and dispatches.
- Implement stock reservations.
- Add movement history and low-stock alerts.
- Add transactional and concurrency tests.

## 9. PHASE 3 — ORDER IMPORT

After inventory is functional:

- Implement manual order creation.
- Implement WhatsApp text paste.
- Implement batch intake.
- Preserve original source messages.
- Add product alias matching.
- Flag ambiguous fields.
- Implement the review and correction interface.
- Add duplicate-import and retry tests.

Do not require OCR for pasted text.

## 10. PHASE 4 — INVOICING

Implement the invoice lifecycle only after the order workflow and business rules are defined.

- Create draft invoices.
- Calculate all totals on the backend.
- Generate PDFs.
- Enforce invoice issuance permissions.
- Preserve issued invoice snapshots.
- Implement controlled corrections and cancellations.
- Test numbering and financial calculations under concurrency.

## 11. PHASE 5 — HARDENING

Add:

- Authorization tests.
- Input validation tests.
- Concurrent stock update tests.
- Batch retry tests.
- Invoice integrity tests.
- Backup and restore instructions.
- Structured logs and health checks.
- Deployment documentation.
- A pilot checklist.

Evaluate Darija extraction against representative, anonymized real-world messages before introducing automatic processing beyond draft creation.

## 12. FIRST RESPONSE REQUIRED

Start by reading the project documentation and inspecting the repository.

Then report:

1. What already exists.
2. The proposed architecture and directory structure.
3. The first implementation tasks.
4. Any important assumptions.
5. The exact files you will create or modify.

Then begin Phase 1.

Do not stop after presenting a plan if you have the tools and environment required to implement it. Build, test and document the first working increment.

The objective is a maintainable, secure and genuinely functional application—not merely a visual demonstration.