# 1. لوحة القيادة — Dashboard

- **الملف:** `frontend/src/pages/Dashboard.tsx`
- **الراوت:** `/` (index route داخل `Layout`)
- **الصلاحية:** الراوت مفتوح لأي مستخدم مسجل (ما فيهش `perm` prop)، أما رابط الـ sidebar مخفي بـ `view_authorized_records`.
- **API:** `GET /dashboard` (نداء واحد).
- **عنوان الصفحة:** `DarijaStock — لوحة القيادة`.

## المحتوى

صفحة نظرة عامة (Overview) جمعة فيها مؤشرات النشاط، تنبيهات الستوك، وآخر الحركات.

### 4 بطاقات إحصائية (StatCards) — grid `sm:grid-cols-2 xl:grid-cols-4`
كل بطاقة **رابط** (StatCard `to=`) كيتنقّل عند الضغط عليه:

| البطاقة | الحقل | الأيقونة / اللون | كتمشي لـ |
|---------|-------|------------------|-----------|
| الكوموندات (30 يوم) | `orders_in_period` + sub `الإجمالي: {sum orders_by_status}` | ClipboardList / teal | `/orders` |
| الفواتير الصادرة | `invoices_by_status.issued` + sub `الإجمالي: {sum}` | FileText / blue | `/invoices` |
| مدخول الفواتير (30 يوم) | `invoices_total_in_period` (formatMoney) | Boxes / green | `/invoices` |
| منتجات تحت العتبة | `low_stock.length` | AlertTriangle / amber | `/inventory?low_only=true` |

> عدد الأيام جاي ديناميكي من `period_days ?? 30` (كيتستعمل فالعنوان: «الكوموندات (N يوم)»).

### بطاقة «إحصائيات عامة» (Package)
- «المنتجات النشيطة» = `products_count`
- «الزبائن النشيطين» = `customers_count`

### بطاقة «تنبيهات الستوك» (AlertTriangle) — `DataTable`
الأعمدة: `SKU` (`sku`, dir=ltr) · «المنتج» (`name`) · «فيزيائي» (`physical`) · «عتبة» (`reorder_threshold`)
- Empty: «كلشي مزيان» / hint «ما كاينش منتجات تحت العتبة»

### بطاقة «آخر حركات الستوك» — `DataTable`
الأعمدة: «النوع» (`type` عبر `movementLabel`) · «المنتج» (`product_name`) · «الكمية» (`physical_delta`) · «التاريخ» (`created_at`)
- Empty: «ما كاينش حركات»

## الديزاين
- بلا `PageHeader` actions، pure read-only.
- صف البطاقات الإحصائية ثم صف بطاقتين (`xl:grid-cols-2`)، ثم بطاقة الحركات بعرض كامل.
- البطاقتين الصغيرتين كتستعملو نفس `DataTable` (كيوليو كارط على الموبايل).
- Loading = `PageLoader` · فشل التحميل = `EmptyState title="تعذر تحميل البيانات"` + toast خطأ.

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** بعد تسجيل الدخول (`navigate("/")`) · رابط الـ sidebar «لوحة القيادة».
- **لفين كتمشي (Navigates to):** بطاقات `StatCard` → [الكوموندات](02-orders.md) · [الفوترة](08-invoices.md) · [الستوك](07-inventory.md) (`?low_only=true`).
- **صفحات مرتبطة:** [الكوموندات](02-orders.md) · [الفوترة](08-invoices.md) · [الستوك](07-inventory.md).
