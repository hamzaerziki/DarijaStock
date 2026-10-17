# 8. الفوترة — Invoices

- **الملف:** `frontend/src/pages/Invoices.tsx`
- **الراوت:** `/invoices`
- **الصلاحية:** `view_invoice_history`
- **API:** `GET /invoices` بمعاملات `{page, page_size: 20, status_filter?}`.
- **عنوان الصفحة:** `DarijaStock — الفوترة`.

## المحتوى
قائمة الفواتير (مسودة وصادرة) مع فلترة بالحالة.

### `?highlight={id}` (موصول)
كقرا `useSearchParams`؛ ملي تجي من [تفاصيل الكوموند](03-order-detail.md) بعد إنشاء الفاتورة، كتمرّر لصف الفاتورة (ولو كانت فالصفحة الحالية) عبر `scrollIntoView({behavior:"smooth", block:"center"})` وكتطبق عليه تلوين (`bg-primary-soft`)، ومن بعد **~3 ثواني** كتحيد الـ param من الـ URL (`replace`). كتختار النسخة **الظاهرة** (`offsetParent !== null`) باش تصيب الصف الصحيح بين الجدول (ديسكتوب) والكارط (موبايل).

### أعمدة الجدول (`DataTable`)
| العمود | الحقل | الأولوية |
|--------|-------|---------|
| الرقم | `number \|\| #id` (code) | primary |
| الزبون | `customer_name` (مقصوص) | — |
| التاريخ | `issue_date` | — |
| الحالة | `status` → `<InvoiceStatusBadge>` | badge |
| المجموع | `total` (formatMoney) | tabular |

### الفلاتر
Select الحالة (w-48): «كل الحالات» + القيم الحقيقية من `INVOICE_STATUS`: مسودة (`draft`) · صادرة (`issued`) · ملغاة (`cancelled`). `Pagination` (20/صفحة)، والحالة كتّحفظ فالـ URL. بلا بحث نصي.

### الأفعال
- صف «عرض» (Eye, ghost) — **معطّل (`disabled`)** مع chip «قريبا» + `title` السبب (بلا route تفاصيل للفواتير).
- إنشاء الفاتورة كيوقع فـ [تفاصيل الكوموند](03-order-detail.md) (`POST /invoices/from-order/{id}`)، ماشي هنا.

## الديزاين
- عنوان Card «لائحة الفواتير» بأيقونة FileText. Empty: «ما كاينش فواتير» + hint «الفواتير كتتولد من صفحة تفاصيل الكوموند».

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** sidebar «الفوترة» · [تفاصيل الكوموند](03-order-detail.md) عبر `?highlight={id}` · [لوحة القيادة](01-dashboard.md).
- **لفين كتمشي (Navigates to):** — (زر «عرض» معطّل).
- **صفحات مرتبطة:** [تفاصيل الكوموند](03-order-detail.md) · [التقارير](09-reports.md) (مدخول الفواتير).
