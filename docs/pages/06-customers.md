# 6. الزبائن — Customers

- **الملف:** `frontend/src/pages/Customers.tsx`
- **الراوت:** `/customers`
- **الصلاحية:** `view_permitted_customers`
- **API:** `GET /customers` بمعاملات `{page, page_size: 20, q?}`.
- **عنوان الصفحة:** `DarijaStock — الزبائن`.

## المحتوى
تصفح/بحث دليل الزبائن.

### أعمدة الجدول (`DataTable`)
| العمود | الحقل | الأولوية |
|--------|-------|---------|
| الكود | `code` (dir=ltr) | primary |
| الإسم | `name` (مقصوص) | — |
| الهاتف | `phone` (dir=ltr) | — |
| المدينة | `city` | — |
| نشط | `is_active` → Badge أخضر «نشط» / رمادي «موقوف» | badge |

### الفلاتر / البحث
Input `«بحث: الكود/الإسم/الهاتف»` + زر «بحث» (يدوي، Enter كيفعل نفس الشي). `Pagination` (20/صفحة). البحث كيرجع `page` لـ 1 وكتّحفظ الحالة فالـ URL.

### الأفعال
- رأس الصفحة «إضافة زبون» (Plus) — **معطّل (`disabled`)** مع chip «قريبا» + `title` السبب (بلا handler).

## الديزاين
- نفس نمط Products بالضبط (`useListPage` + `DataTable`). Empty: «ما كاينش زبائن».

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** sidebar «الزبائن».
- **لفين كتمشي (Navigates to):** — (زر «إضافة زبون» معطّل).
- **صفحات مرتبطة:** [الكوموندات](02-orders.md) · [الفوترة](08-invoices.md) · [الطلب العمومي](12-public-order.md).
