# DarijaStock — Order & Inventory Management

## Project Overview

DarijaStock is a secure web application for managing customer orders, inventory, customers and invoices for a Moroccan business.

Employees currently receive orders through WhatsApp and manually prepare documents. The application will reduce repetitive work by allowing employees to paste WhatsApp messages into a batch-processing workspace, convert them into structured order drafts, validate products and quantities against the product catalog, and prepare invoices.

Customers can also submit orders directly through a web form.

The first release must work without the WhatsApp API and without requiring paid OCR.

## Main Objectives

- Provide a simple Moroccan Darija interface.
- Manage products, customers, prices and units of measurement.
- Import one or multiple WhatsApp order messages.
- Create orders manually or through a customer-facing form.
- Extract order details using deterministic parsing rules and optional AI.
- Support Darija, Arabic, French and Latin transliteration.
- Validate product identity, quantities, units and prices.
- Manage stock receipts, reservations, dispatches, returns and adjustments.
- Generate controlled invoice PDFs.
- Support multiple employees and role-based permissions.
- Maintain a traceable audit history.
- Scale safely as order volume and the number of users grow.

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend
- Python
- FastAPI
- Pydantic
- SQLAlchemy

### Database
- PostgreSQL
- Alembic migrations

### Optional Background Processing
- Celery
- Redis

### Documents and Deployment
- HTML-based invoice templates
- WeasyPrint or a tested PDF alternative
- Docker Compose
- Pytest for backend tests

## Application Modules

1. Dashboard
2. WhatsApp text import
3. Batch order processing
4. Manual order creation
5. Customer management
6. Product catalog and aliases
7. Inventory management
8. Stock movement history
9. Order review and approval
10. Invoice generation and history
11. User and permission management
12. Reports and audit logs

## Core Workflow

1. An employee copies a customer message from WhatsApp.
2. The employee pastes the message into the application.
3. The parser extracts candidate customer and product information.
4. Products are matched against the approved catalog.
5. Missing or ambiguous fields are flagged.
6. The employee reviews and corrects the order.
7. An authorized employee confirms the order.
8. The system applies the configured stock reservation rules.
9. The invoice is prepared and issued according to the company's approval process.
10. Stock is deducted at the configured fulfillment or dispatch event.
11. All important actions are recorded in the audit history.

## Inventory Rules

- Maintain a traceable inventory movement ledger.
- Distinguish physical stock, reserved stock and available stock.
- Do not deduct physical stock when a draft order is created.
- Prevent negative stock by default.
- Require authorization for adjustments.
- Use database transactions for reservations and dispatches.
- Support product units such as piece, pack, carton and box.
- Store explicit unit-conversion rules.
- Never silently modify historical stock movements.

## Invoice Rules

- Perform monetary calculations on the backend.
- Use decimal arithmetic.
- Generate unique invoice numbers safely under concurrent requests.
- Preserve issued invoice snapshots.
- Restrict invoice issuance to authorized users.
- Use a controlled correction or cancellation process.
- Configure taxes and required invoice fields according to the business's applicable Moroccan requirements.

## Language and UI

The employee interface should use natural Moroccan Darija.

Support:
- Arabic RTL layouts.
- French business terminology where familiar.
- Product names in Arabic, French and Latin transliteration.
- Mixed-language messages.
- Clear validation and error messages.
- Responsive desktop and mobile layouts.

Preserve the original imported customer message for verification.

## Security

- Secure authentication and backend authorization.
- Least-privilege role permissions.
- HTTPS in production.
- Protected environment variables and secrets.
- Strict server-side validation.
- Parameterized database access.
- Secure file handling.
- Audit logs for sensitive operations.
- Tested backups and restore procedures.
- No secrets or unnecessary customer data in logs.

## Development Approach

Build the application as a modular monolith.

Phase 1: Project foundation, authentication, users, customers and products.

Phase 2: Inventory ledger, stock movements, units and reservations.

Phase 3: Manual orders, WhatsApp text import and batch review.

Phase 4: Parsing, Darija aliases, product matching and optional AI assistance.

Phase 5: Invoice generation, PDF templates and approval controls.

Phase 6: Reports, security testing, concurrency testing, backups and pilot deployment.

## Definition of Done

A feature is complete only when its backend, database integration, frontend, validation and relevant tests work together.

Do not use fake data as a substitute for core functionality. Clearly label any mock data used during UI development.

Every stock movement and invoice issuance must be traceable to an authorized operation.

Start with a working, testable foundation and implement the application incrementally.