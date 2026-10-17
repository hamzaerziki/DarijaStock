# 12. الطلب العمومي — Public Order

- **الملف:** `frontend/src/pages/PublicOrder.tsx`
- **الراوت:** `/public/order` (عام، خارج `Layout`)
- **الصلاحية:** عامة — أي زبون بلا حساب.
- **API:** `GET /public/products` · `POST /public/orders` · (أفضل مجهود: `POST /public/orders/track`).

## المحتوى
رحلة طلب موجّهة للزبون (Customer flow) على **4 خطوات** + شاشة نجاح:

| # | الخطوة | الوصف |
|---|--------|-------|
| 1 | **اختار المنتوجات** (`browse`) | كتالوغ مع بحث + chips الفئات + بطاقات منتجات بأزرار كمية |
| 2 | **راجع السلة** (`cart`) | `OrderSummary` قابل للتعديل (زيادة/نقص/حيد) |
| 3 | **معلومات الزبون** (`info`) | نموذج: الاسم الكامل، رقم الهاتف، المدينة، العنوان، ملاحظة |
| 4 | **تأكيد الطلب** (`confirm`) | مراجعة معلومات + منتوجات + زر «أكد وأرسل الطلب» |
| — | **النجاح** | رقم الطلب الحقيقي + الحالة + المجموع (من track) + «تبع الطلب ديالك» |

### مكوّنات (`frontend/src/components/public/`)
`PublicShell` (header/footer) · `OrderProgress` (مؤشر الخطوات) · `ProductCard` · `QuantitySelector` · `OrderSummary` · `StatusTimeline` · `types.ts`.

### التفاصيل التقنية
- **الخطوة فالـ URL:** الخطوة الحالية كتتقرى من `?step=` (`browse`/`cart`/`info`/`confirm`) وكتّكتب بـ `replace`. هادشي كيخلي **الـ refresh والرجوع** يبقاو فنفس الخطوة (بلا `?step` ⇒ `browse`). عند النجاح كيتحيد `step` من الـ URL.
- **السلة** = `Record<product_id, qty>` محفوظة فـ `localStorage` بمفاتيح **مُرقّمة (versioned)**:
  - `ds_public_cart_v1` → `{ v: 1, items: {...} }`
  - `ds_public_customer_v1` → `{ v: 1, data: {...} }`
  - كان الإصدار/الشكل ما مطابقش ⇒ كيتّجاهل وكيبدا من الصفر (بلا كراش).
- **الأرقام:** integer-cents (`toCents`) باش ما يكونش drift فالفلوس (`formatMoney`).
- **الهاتف:** `normalizePhone` (`+212`/`00212` → `0...`) قبل الإرسال، و `isValidPhone` (`^0[5-7]\d{8}$`) فالتحقق — نفس قاعدة باقي النظام.
- **الإرسال:** `POST /public/orders` بـ `{name, phone, city?, address?, note?, items:[{product_id, quantity}]}` (نفس contract بالضبط)، على `useSubmitLock` (منع الإرسال المزدوج).
- **قبل التأكيد:** كيتعاد جلب المنتوجات لـ revalidation؛ إلا شي منتوج مشا، كيتحيد من السلة وكيبان تنبيه.
- **المجموع:** المعروض للزبون **تقريبي** («المجموع التقريبي») ومكتوب بالواضح أن «المجموع النهائي كيتأكد من طرف الفريق بعد المراجعة».
- **النجاح:** كيعرض `order_number`/`status` الحقيقية من الـ response (الحالة عبر `statusLabel` من `lib/status.ts`)، وكيجيب المجموع الحقيقي عبر `POST /public/orders/track` (best-effort — إلا فشل كيبان غير «المجموع النهائي غادي يتأكد معاك من طرف الفريق»).
- **التوكنز:** primary `#0D8177`، navy، صفحة `#F1F5F9`، حدود `#DFE7EF`.

## الديزاين
- Header ثابت فيه لوجو + «تبع الطلب» + chip السلة.
- Indicator خطوات: أرقام أفقية (ديسكتوب) / «الخطوة X من Y» + شريط (موبايل).
- Action bar لاصق فالأسفل (sticky bottom): المجموع + «كمل الطلب» / زر رجوع.
- Empty states: «السلة خاوية» · «ما لقينا حتى منتوج بهاد البحث» · خطأ تحميل مع «عاود المحاولة».
- أزرار الرجوع/التالي كيتعطّلو حسب الحالة (`count === 0` / `revalidating`).

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** مباشر `/public/order` (بلا حساب) · رابط «طلب جديد» من [تتبع الطلب](13-track-order.md).
- **لفين كتمشي (Navigates to):** [تتبع الطلب](13-track-order.md) (شاشة النجاح → «تبع الطلب ديالك»، مع `state.orderNumber`).
- **صفحات مرتبطة:** [تتبع الطلب](13-track-order.md) · backend `/public/products` + `/public/orders` + `/public/orders/track`.
