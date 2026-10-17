# 5. المنتجات — Products

- **الملف:** `frontend/src/pages/Products.tsx`
- **الراوت:** `/products`
- **الصلاحية:** `view_permitted_products`
- **API:** `GET /products` بمعاملات `{page, page_size: 20, q?}`.
- **عنوان الصفحة:** `DarijaStock — المنتجات`.

## المحتوى
تصفح/بحث كتالوغ المنتجات (SKUs، الوحدات، الأثمنة).

### أعمدة الجدول (`DataTable`)
| العمود | الحقل | الأولوية |
|--------|-------|---------|
| SKU | `sku` (dir=ltr) | primary |
| الإسم | `name_ar \|\| name` (مقصوص) | — |
| الفئة | `category` | — |
| الوحدة | `base_unit` | — |
| الثمن | `price` (formatMoney) | tabular |
| نشط | `is_active` → Badge أخضر «نشط» / رمادي «موقوف» | badge |

### الفلاتر / البحث
Input `«بحث: SKU / الاسم»` + زر «بحث» (يدوي، Enter كيفعل نفس الشي). تغيير البحث كيرجّع `page` لـ 1، والحالة (page/q) **كتّحفظ فالـ URL**. `Pagination` (20/صفحة).

ملي تكون هناك تصفية: كيبان شريط «{total} نتيجة مطابقة» + «مسح البحث»، والـ empty كيولي «ما كاينش نتائج مطابقة».

### الأفعال
- رأس الصفحة «إضافة منتج» (Plus) — **معطّل (`disabled`)** مع chip «قريبا» + `title` السبب (placeholder، بلا dialog/API).
- ما كاين حتى نداء create/edit/delete فهاد الملف.

## الديزاين
- أبسط قالب قائمة (نفس نمط Customers) باستعمال `useListPage` + `DataTable`. Empty: «ما كاينش منتجات» / hint «أضف منتج جديد».

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** sidebar «المنتجات».
- **لفين كتمشي (Navigates to):** — (زر «إضافة منتج» معطّل، بلا تنقل).
- **صفحات مرتبطة:** [الستوك](07-inventory.md) · [الكوموندات](02-orders.md) · [الطلب العمومي](12-public-order.md) (المنتجات المعروضة للزبائن).
