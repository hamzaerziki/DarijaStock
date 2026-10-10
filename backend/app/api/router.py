from fastapi import APIRouter

from app.api.routes import (
    auth,
    customers,
    dashboard,
    imports,
    inventory,
    invoices,
    orders,
    products,
    public,
    reports,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(customers.router)
api_router.include_router(inventory.router)
api_router.include_router(orders.router)
api_router.include_router(imports.router)
api_router.include_router(invoices.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
api_router.include_router(public.router)