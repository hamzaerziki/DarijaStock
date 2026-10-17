# 3. تفاصيل الكوموند — Order Detail

- **الملف:** `frontend/src/pages/OrderDetail.tsx`
- **الراوت:** `/orders/:id`
- **الصلاحية:** `view_authorized_records` (+ صلاحيات داخل الصفحة لكل action).
- **API:** `GET /orders/{id}` + `GET /orders/{id}/history` (بالتوازي) · `POST /orders/{id}/confirm|fulfill|cancel` · `POST /invoices/from-order/{id}`.
- **عنوان الصفحة:** `DarijaStock — تفاصيل الكوموند`.

## المحتوى
عرض كامل لكوموند واحد: العناصر بالمجاميع، معلومات الزبون، الملاحظات، سجل الحالات، وأزرار تغيير الحالة.

- **Header:** عنوان `كوموند {order_number}`، subtitle `المصدر: {source} — {created_at}`، زر «رجوع» (ArrowRight → `/orders`).
- **Card «العناصر»** (فيه `<StatusBadge status={order.status}>`):

| العمود | الحقل | الأولوية |
|--------|-------|---------|
| المنتج / النص | `raw_text \|\| #product_id` | primary |
| الوحدة | `unit_code` | — |
| الكمية | `quantity` (formatQty) | tabular |
| الثمن | `unit_price` (formatMoney) | tabular |
| المجموع | `line_total` (formatMoney, font-medium) | tabular |
| المطابقة | `match_status` → `<MatchStatusBadge>` (مطابق/غامض/غير مطابق) | badge |

- **مجاميع:** «المجموع الفرعي» (`subtotal`) · «الخصم» (`discount_total`) · «الضريبة» (`tax_total`) · **«المجموع»** (bold, `total` بالتوكين `currency`).
- **Card «ملاحظات»** (شرطية): «ملاحظة الزبون» (`customer_note`) · «ملاحظة داخلية» (`internal_note`).
- **Sidebar Card «الزبون»:** الاسم (أو «— بدون زبون —»)، `كود: {code}`، `هاتف: {phone}` (الأكواد/الهاتف بـ `dir=ltr`).
- **Sidebar Card «أفعال»:** أزرار تغيير الحالة حسب الجدول تحت، داخل منطقة `aria-live="polite"`.
- **Sidebar Card «سجل الحالات»:** `from_status → to_status` + التواريخ. القيم كتتعرض عبر `statusLabel()` من `lib/status.ts`. Empty: «ما كاينش».

### أفعال الـ Sidebar (كل واحد محكوم بـ perm عبر `can()` = admin أو perm)
| الزر | الشرط (status ∈) | الصلاحية | الـ API | التأكيد |
|------|------------------|----------|--------|---------|
| تأكيد و حجز الستوك | `new` \| `needs_review` | `approve_orders` | `POST /orders/{id}/confirm` | «غادي يتحجز الستوك للكوموند. متأكد؟» |
| تسليم (Truck, navy) | `confirmed` \| `reserved` \| `preparing` | `dispatch_stock` | `POST /orders/{id}/fulfill` | «غادي يخرج الستوك من المخزن. متأكد؟» |
| إنشاء مسودة فاتورة | `confirmed` \| `reserved` \| `preparing` \| `fulfilled` | `prepare_invoice_drafts` | `POST /invoices/from-order/{id}` → يتنقّل لـ `/invoices?highlight={id}` | — |
| إلغاء (XCircle, destructive) | أي حالة **ماشي** `fulfilled` ولا `cancelled` | `reject_orders` | `POST /orders/{id}/cancel` | «غادي يتحرر الستوك المحجوز. متأكد؟» |

> **مهم:** ما كاينش حالة `draft` ولا `invoiced` (مطابق للـ backend). التأكيد كيقبل `new|needs_review`، والتسليم كيقبل `confirmed|reserved|preparing`.

- إذا الحالة قابلة للتأكيد والمستخدم بلا `approve_orders` → hint بأيقونة ShieldAlert: «ما عندكش صلاحية التأكيد.».
- إلا ما كان حتى فعل متاح → نص: «ما كاين حتى فعل متاح لحالة "{label}".».
- أثناء أي action، الأزرار كتتطبق عليها حالة `busy` من `useSubmitLock` (منع الإرسال المزدوج).

## الديزاين
- تخطيط `xl:grid-cols-3`، المحتوى الرئيسي `xl:col-span-2`، والـ sidebar فيه 3 بطاقات (بالنافي الـ sidebar كيبان شمال بصرياً في RTL).
- `ConfirmDialog` مع `destructive` للإلغاء + `loading={busy}`.
- Toasts بالدارجة: «تم التأكيد والحجز» / «تم التسليم من المخزن» / «تم الإلغاء» / «تم إنشاء مسودة الفاتورة». Empty: «الكوموند ماموجوداش».

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** [الكوموندات](02-orders.md) (صف/زر «تفاصيل» → `/orders/{id}`).
- **لفين كتمشي (Navigates to):** [الكوموندات](02-orders.md) (زر «رجوع») · [الفوترة](08-invoices.md) (`/invoices?highlight={id}` عبر «إنشاء مسودة فاتورة»).
- **صفحات مرتبطة:** [الكوموندات](02-orders.md) · [الفوترة](08-invoices.md) · [الستوك](07-inventory.md) (الحجز/التحرير).
