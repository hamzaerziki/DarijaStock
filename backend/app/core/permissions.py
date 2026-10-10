"""Role and permission definitions.

Roles and permissions are defined in project-spec.json. Permissions are
enforced on the backend; UI hiding is never a substitute for API checks.
"""

from enum import Enum


class Role(str, Enum):
    admin = "admin"
    order_operator = "order_operator"
    stock_manager = "stock_manager"
    order_approver = "order_approver"
    invoice_operator = "invoice_operator"
    read_only = "read_only"


class Permission(str, Enum):
    # users / settings
    manage_users = "manage_users"
    manage_settings = "manage_settings"
    # catalog / customers
    manage_products = "manage_products"
    manage_customers = "manage_customers"
    view_permitted_products = "view_permitted_products"
    view_permitted_customers = "view_permitted_customers"
    # inventory
    manage_inventory = "manage_inventory"
    view_inventory = "view_inventory"
    receive_stock = "receive_stock"
    dispatch_stock = "dispatch_stock"
    manage_returns = "manage_returns"
    adjust_stock = "adjust_stock"
    # orders
    create_orders = "create_orders"
    import_messages = "import_messages"
    edit_unconfirmed_orders = "edit_unconfirmed_orders"
    manage_orders = "manage_orders"
    review_orders = "review_orders"
    approve_orders = "approve_orders"
    reject_orders = "reject_orders"
    # invoices
    prepare_invoice_drafts = "prepare_invoice_drafts"
    issue_invoices = "issue_invoices"
    view_invoice_history = "view_invoice_history"
    # reports
    view_reports = "view_reports"
    view_authorized_records = "view_authorized_records"
    view_authorized_reports = "view_authorized_reports"


ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.admin: set(Permission),
    Role.order_operator: {
        Permission.create_orders,
        Permission.import_messages,
        Permission.edit_unconfirmed_orders,
        Permission.view_permitted_customers,
        Permission.view_permitted_products,
        Permission.view_authorized_records,
    },
    Role.stock_manager: {
        Permission.view_inventory,
        Permission.receive_stock,
        Permission.dispatch_stock,
        Permission.manage_returns,
        Permission.adjust_stock,
        Permission.view_permitted_products,
        Permission.view_authorized_records,
    },
    Role.order_approver: {
        Permission.review_orders,
        Permission.approve_orders,
        Permission.reject_orders,
        Permission.view_authorized_records,
        Permission.view_permitted_customers,
        Permission.view_permitted_products,
    },
    Role.invoice_operator: {
        Permission.prepare_invoice_drafts,
        Permission.issue_invoices,
        Permission.view_invoice_history,
        Permission.view_authorized_records,
        Permission.view_permitted_customers,
        Permission.view_permitted_products,
    },
    Role.read_only: {
        Permission.view_authorized_records,
        Permission.view_authorized_reports,
    },
}


def permissions_for_role(role: Role) -> set[Permission]:
    return set(ROLE_PERMISSIONS.get(role, set()))


def role_has_permission(role: Role, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())
