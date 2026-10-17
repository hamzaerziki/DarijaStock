# 7. الستوك — Inventory

- **الملف:** `frontend/src/pages/Inventory.tsx`
- **الراوت:** `/inventory`
- **الصلاحية:** `view_inventory`
- **API:** `GET /inventory/stock` بمعاملات `{page, page_size: 20, q?, low_only}`.
- **عنوان الصفحة:** `DarijaStock — الستوك`.
- **الروابط الواردة:** كتقبل `?low_only=true` (من لوحة القيادة: بطاقة «منتجات تحت العتبة»).

## المحتوى
عرض دفتر مخزون المستودع — الكميات الفيزيائية/المحجوزة/المتوفرة مع تمييز نقص المخزون.

### أعمدة الجدول (`DataTable`)
| العمود | الحقل | الأولوية |
|--------|-------|---------|
| SKU | `sku` (dir=ltr) | primary |
| المنتج | `name_ar \|\| name` (مقصوص) | — |
| الوحدة | `unit` | — |
| الثمن | `price` (formatMoney) | tabular |
| فيزيائي | `physical` (formatQty) | tabular |
| محجوز | `reserved` (formatQty) | tabular |
| متوفر | `available` (formatQty) — إلا `low_stock` كيولي Badge كهرماني «{qty} ⚠» | badge |
| عتبة | `reorder_threshold` (formatQty) | tabular |

### الفلاتر / البحث
- Input `«بحث SKU/إسم»` + زر «بحث» (يدوي، Enter كيفعل).
- Select low-stock: «كل» / «أقل من العتبة فقط» → معامل `low_only`. تغيير الفلتر كيرجّع `page` لـ 1.
- `Pagination` (20/صفحة). الحالة (page/q/low_only) كتّحفظ فالـ URL.

### الأفعال
- **بلا أفعال** — صفحة read-only (بلا أزرار إضافة/تعديل/حركة فهاد الصفحة).

## الديزاين
- الصفوف low-stock كتاخد tint خفيف عبر `rowClassName` (`bg-warning-soft/40`) — كيتطبق على `<tr>` والكارط بجوج.
- Empty (ملي تكون تصفية): «ما كاينش نتائج مطابقة» + «مسح التصفية»؛ وإلا «ما كاينش نتائج».

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** sidebar «الستوك» · [لوحة القيادة](01-dashboard.md) (`/inventory?low_only=true`).
- **لفين كتمشي (Navigates to):** — (صفحة read-only).
- **صفحات مرتبطة:** [المنتجات](05-products.md) · [لوحة القيادة](01-dashboard.md) (تنبيهات العتبة) · [تفاصيل الكوموند](03-order-detail.md) (الحجز/التحرير).
