# DarijaStock — دليل صفحات النظام

هاد المجلد كيوثق **كل صفحة** فنظام DarijaStock: شنو كتعرض (المحتوى) وكيفاش مصممة (الديزاين)، مع الراوت، الصلاحية، والأعمدة/API المستعملة.

DarijaStock = تطبيق React + TypeScript + Vite (RTL/عربي) + FastAPI backend، مخصص لتسيير الكوموندات، الستوك، الفوترة، والزبائن.

> **ملاحظة (تحديث):** هاد الوثائق مُحيَّنة مع مرحلة «التحسينات والمعايير» (وجدت أساسات مشتركة جديدة: حالة موحدة، فلوس، تسميات، تحقق، hooks، وجدول متجاوب). شوف قسم [الأساسات المشتركة](#الأساسات-المشتركة-shared-foundations).

## الصفحات

| # | الصفحة | الملف | الراوت | الصلاحية (perm) | التوثيق |
|---|--------|-------|--------|------------------|---------|
| 1 | لوحة القيادة | `Dashboard.tsx` | `/` | *(أي مستخدم مسجل)* | [01-dashboard](01-dashboard.md) |
| 2 | الكوموندات | `Orders.tsx` | `/orders` | `view_authorized_records` | [02-orders](02-orders.md) |
| 3 | تفاصيل الكوموند | `OrderDetail.tsx` | `/orders/:id` | `view_authorized_records` | [03-order-detail](03-order-detail.md) |
| 4 | استيراد المسجات | `Import.tsx` | `/import` | `import_messages` | [04-import](04-import.md) |
| 5 | المنتجات | `Products.tsx` | `/products` | `view_permitted_products` | [05-products](05-products.md) |
| 6 | الزبائن | `Customers.tsx` | `/customers` | `view_permitted_customers` | [06-customers](06-customers.md) |
| 7 | الستوك | `Inventory.tsx` | `/inventory` | `view_inventory` | [07-inventory](07-inventory.md) |
| 8 | الفوترة | `Invoices.tsx` | `/invoices` | `view_invoice_history` | [08-invoices](08-invoices.md) |
| 9 | التقارير | `Reports.tsx` | `/reports` | `view_reports` | [09-reports](09-reports.md) |
| 10 | المستخدمين | `Users.tsx` | `/users` | `manage_users` | [10-users](10-users.md) |
| 11 | تسجيل الدخول | `Login.tsx` | `/login` | — (عام) | [11-login](11-login.md) |
| 12 | الطلب العمومي | `PublicOrder.tsx` | `/public/order` | — (عام) | [12-public-order](12-public-order.md) |
| 13 | تتبع الطلب | `TrackOrder.tsx` | `/public/track` | — (عام) | [13-track-order](13-track-order.md) |

## الهيكل المشترك (App Shell)

كل الصفحات الإدارية (1–10) داخلة فـ `Layout.tsx`:

- **Skip link:** أول عنصر قابل للتركيز فالصفحة «تخطى إلى المحتوى» → `#main-content` (كيبان غير عند التركيز بالـ keyboard).
- **Sidebar** على اليمين (RTL)، عرض 248px، لون `navy` (#102B46)، فيه 9 روابط + هوية المستخدم وزر الخروج فالأسفل. كيطيح (collapse) لـ 76px (أيقونات فقط) على الديسكتوب، وكيولي drawer/off-canvas على الموبايل مع backdrop. الحالة (مطوي/مبسوط) **كتّحفظ فـ `localStorage`** تحت `darjastock_sidebar_collapsed` (`"1"`/`"0"`).
- **Focus trap:** الـ drawer على الموبايل كيعزل التركيز داخل الـ sidebar، كيتسد بـ `Escape`، وكيرجّع التركيز للعنصر اللي فتحه.
- **Topbar** ثابت (height 68px، أبيض) فيه hamburger (موبايل) + اسم/دور المستخدم.
- **Main** content area بـ `id="main-content"` و `tabIndex={-1}` و `max-w-[1600px]` و padding متجاوب. تعيين التركيز عليه بعد التنقل كيسهّل التصفح بالكيبورد/قارئ الشاشة.
- **عنوان الصفحة (document.title):** كيتعيّن تلقائياً عبر `usePageTitle` حسب الراوت (`DarijaStock — {العنوان}`)، من خريطة `TITLES` داخل `Layout.tsx`.
- كل رابط فالsidebar مخفي حسب الصلاحية (نفس منطق `ProtectedRoute`).

`ProtectedRoute`: إذا `perm` محددة والمستخدم ماشي `admin` وما عندوش الصلاحية، الصفحة كتعرض بطاقة: «ما عندكش الصلاحية لدخول هاد الصفحة» + زر «رجوع للوحة القيادة» → `/`. الـ **admin ديما كيدوز**. وإلا كان غير مسجل الدخول → كيتبعث لـ `/login` مع `state.from = location.pathname`.

## الديزاين توكِنز (Design tokens)

التصميم مبني على توكنز موحّدة فـ `tailwind.config.js`:

- **Primary (teal):** `#0D8177` (hover `#096B63`, active `#07574F`, soft `#DDF5F0`, tint `#EFFAF7`)
- **Navy (sidebar/headings):** `#102B46`
- **Page background:** `#F1F5F9` · **Slate** = رمادي مائل للنافي
- **Semantics:** success `#15936F`, warning `#D97706`, danger `#DC4545`, info `#2563EB` (+ soft variants)
- **Radii:** md 9px, xl 14px, 2xl 16px · **Shadows:** card / card-hover / dropdown / modal
- **Field height:** 42px · **Fonts:** `tabular-nums` (`tnum`) للأرقام، `code` للأكواد
- **RTL:** كتُستعمل أدوات منطقية (`ms/me/ps/pe/text-start/text-end/start-*/end-*`) ماشي فيزيكية (`ml/mr/...`)

## الأساسات المشتركة (Shared foundations)

باش تكون «مصدر واحد للحقيقة» بين الصفحات:

| الملف | الدور |
|------|-------|
| `lib/status.ts` | حالات الكوموند (`ORDER_STATUS`: `new/needs_review/confirmed/reserved/preparing/fulfilled/cancelled`) + حالات الفاتورة (`INVOICE_STATUS`: `draft/issued/cancelled`) + حالات المطابقة (`MATCH_STATUS`) + مراحل التوصيل (`DELIVERY_STAGES`). كل حالة عندها `label/tone/stage`. **ما كاينش `draft` ولا `invoiced` فحالات الكوموند** (مطابق للـ backend). |
| `lib/money.ts` | تحويل آمن للفلوس على **integer cents** (`toCents`/`fromCents`) + `formatMoney` (تنسيق `1 234,50 MAD`، المجموعة بمسافة ضيقة غير فاصلة U+202F). |
| `lib/labels.ts` | تسميات الأدوار (`ROLE_LABELS`/`roleLabel`)، حركات الستوك (`MOVEMENT_LABELS`/`movementLabel`)، وأحداث التدقيق (`AUDIT_LABELS`/`auditLabel`). |
| `lib/validators.ts` | `normalizePhone` (تحويل `+212`/`00212` → `0...`) + `isValidPhone` (`^0[5-7]\d{8}$`) + `splitMessages` (تقسيم مسجات الاستيراد على سطور فارغة). |
| `lib/utils.ts` | `cn` + إعادة تصدير `formatMoney`/`toCents` + `formatQty` + `formatDate`. |
| `components/data/DataTable.tsx` | جدول متجاوب: `<table>` حقيقي من `md` وفوق، وكارط مكدّس لكل صف تحت `md` (نفس الأعمدة والأفعال، بلا إخفاء). كيحطّ `data-row-id` فوق `<tr>` وفوق الكارط (للتمرير لصف معيّن عبر `?highlight`). |
| `components/StatusBadges.tsx` | `StatusBadge`/`InvoiceStatusBadge`/`MatchStatusBadge` + `ComingSoon` (chip «قريبا»). كتعرض نص + أيقونة (ماشي اللون بوحدو). |
| `components/StatCard.tsx` | بطاقة إحصائية موحّدة، ومع `to=` كتولي رابط قابل للتركيز. |
| `hooks/useListPage.ts` | حالة القوائم المشتركة: `page`/`q`/filters **فالـ URL**، بحث يدوي، تغيير الفلتر كيرجّع للصفحة 1، و`AbortController` ضد الردود القديمة. |
| `hooks/useSubmitLock.ts` | قفل ضد الإرسال المزدوج (`{busy, run}`). |
| `hooks/useFocusTrap.ts` | حبس التركيز + منع تمرير الخلفية (للـ dialogs والـ drawer). |
| `hooks/usePageTitle.ts` | تعيين `document.title`. |

**الاختبارات:** `vitest` (بيئة `jsdom`). `npm test` كيشغّل `src/**/*.{test,spec}.{ts,tsx}` (فلوس، حالات، هاتف، تقسيم المسجات، `useSubmitLock`).

## اصطلاحات مشتركة بين الصفحات

- كل صفحة فيها `PageHeader` (عنوان + subtitle + أزرار) فوق.
- القوائم كتستعمل `useListPage` + `DataTable` (استثناء: بطاقات صغيرة inline بحال لوحة القيادة/التقارير).
- **Pagination** فالأسفل (page size = 20، كتُحفظ فالـ URL).
- **Loading** = `PageLoader` · **Empty** = `EmptyState` (مع نص «نتائج مطابقة» + زر «مسح» ملي تكون هناك تصفية) · **Errors** = toast عبر `useToast().push(apiError(e), "error")`.
- Money عبر `formatMoney` · quantities عبر `formatQty` · dates عبر `formatDate`.
- البحث فـ Orders/Products/Customers/Inventory **يدوي** (زر «بحث» أو Enter)، أما filtres (status / low-stock) كيرجعو تلقائياً. الـ `page` كيرجع 1 ملي تبدّل البحث/الفلتر.
- **منع الإرسال المزدوج** فكل نداء كتابي عبر `useSubmitLock`.

> **ملاحظة:** الأزرار ماشي-موصولة (بحال «كوموند جديد»، «إضافة منتج»، «عرض» الفاتورة) **كتّعرض معطّلة (`disabled`) مع chip «قريبا» و `title` كيوضّح السبب** — ماشي محيدّة.

## خريطة العلاقات (Navigation map)

```
/login ──► /  (لوحة القيادة)
              │
   ┌──────────┼──────────────┬───────────────┬──────────────┐
   ▼          ▼              ▼               ▼              ▼
/orders    /import      /products       /customers     /inventory
   │          │              │               │              │
   ▼          └──creates────►│               │              │
/orders/:id                  │               │              │
   │  │                      │               │              │
   │  └──"إنشاء مسودة فاتورة"──► /invoices?highlight=◄──────┘
   │                          │
   ▼                          ▼
 /reports ◄──(aggregates all)──┘

# عام (بلا دخول):
/public/order ──success──► /public/track ──"طلب جديد"──► /public/order
```

- **الصفحات الإدارية** (1–10) داخلة فـ `Layout.tsx` ومحمية بـ `ProtectedRoute`.
- **الصفحات العامة** (11–13) خارج `Layout`: `/login` + `/public/order` + `/public/track`.
- كل صفحة كتوثّق روابط «من فين كتدخل / لفين كتمشي / صفحات مرتبطة» فقسم `## Relations` فالأسفل.
