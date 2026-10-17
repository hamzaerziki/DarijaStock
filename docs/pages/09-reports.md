# 9. التقارير — Reports

- **الملف:** `frontend/src/pages/Reports.tsx`
- **الراوت:** `/reports`
- **الصلاحية:** `view_reports`
- **API:** `GET /reports/summary` + `GET /reports/audit?limit=50` (بالتوازي، كل واحد مستقل بخطأ ديالو).
- **عنوان الصفحة:** `DarijaStock — التقارير`.

## المحتوى
ملخص مؤشرات النشاط + سجل التدقيق (audit log) لأنشطة النظام. القسمين مستقلين: فشل واحد ما كيمنعش الآخر من الظهور.

### 7 بطاقات KPI (`StatCard` المشترك، grid `sm:grid-cols-2 xl:grid-cols-4`)
| البطاقة | الحقل | tone |
|---------|-------|------|
| المنتجات | `products` | teal |
| الزبائن | `customers` | blue |
| الكوموندات | `orders` | navy |
| الفواتير | `invoices` | navy |
| مدخول الفواتير الصادرة | `issued_invoices_total` (formatMoney) | green |
| الستوك الفيزيائي | `stock_physical` (formatQty) | blue |
| الستوك المحجوز | `stock_reserved` (formatQty) | amber |

### Card «سجل التدقيق (آخر 50)» (ScrollText) — `DataTable`
| العمود | الحقل | الأولوية |
|--------|-------|---------|
| الحدث | `action` → Badge teal عبر `auditLabel()` | primary |
| المستخدم | `actor_name` | — |
| الكيان | `entity_type#entity_id` (أو «—») | — |
| التاريخ | `created_at` (formatDate) | — |
| تفاصيل | `details` عبر `<details>` قابل للفتح (JSON منسّق `dir=ltr`) | — |

## الفلاتر / الأفعال
- **بلا فلاتر ولا أفعال** — read-only كاملة. قائمة التدقيق ثابتة `limit: 50` بلا pagination.

## الديزاين
- قيم الملخص كتستعمل **`StatCard` المشترك** (ماشي مكوّن محلي).
- **أخطاء منفصلة:** فشل الملخص كيبان فبطاقة خطأ مخصصة (`summaryErr`)، وفشل التدقيق كيبان داخل بطاقته (`auditErr`) — ما كاينش toast واحد كيغطي بجوج.
- Empty لسجل التدقيق: «ما كاينش سجل».

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** sidebar «التقارير».
- **لفين كتمشي (Navigates to):** — (صفحة read-only).
- **صفحات مرتبطة:** [الكوموندات](02-orders.md) · [الفوترة](08-invoices.md) · [المنتجات](05-products.md) · [الزبائن](06-customers.md) · [الستوك](07-inventory.md).
