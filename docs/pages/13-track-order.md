# 13. تتبع الطلب — Track Order

- **الملف:** `frontend/src/pages/TrackOrder.tsx`
- **الراوت:** `/public/track` (عام، خارج `Layout`)
- **الصلاحية:** عامة — بأي طلب + الهاتف ديالو.
- **API:** `POST /public/orders/track` بـ `{order_number, phone}` → `OrderOut`.

## المحتوى
نموذج بحث عن طلب + عرض تفاصيله ومساره.

- **النموذج:** رقم الطلب + رقم الهاتف، زر «تبع الطلب».
  - Validation: `orderNumber` معمّر + `isValidPhone` (`^0[5-7]\d{8}$`) على الهاتف عبر `lib/validators`.
  - الهاتف كيتبعث **مُنظَّم** (`normalizePhone`: `+212`/`00212` → `0...`) — باش يتقبل نفس الرقم بأشكال مختلفة.
  - **Prefill:** كيتقبل `location.state.orderNumber` (من شاشة نجاح الطلب العمومي).
  - **منع الإرسال المزدوج:** `useSubmitLock` (زر بـ `loading`/`disabled`).
- **النتيجة:**
  - Header فيه الحالة عبر **`<StatusBadge status={order.status} />`** (نص + أيقونة، من `lib/status.ts`).
  - Info boxes: رقم الطلب · المجموع النهائي · تاريخ الطلب · الزبون.
  - **«مسار الطلب»** → `StatusTimeline` (عرضي فقط): تسجل الطلب → قيد المراجعة → مأكد و محجوز → قيد التحضير → تم التسليم؛ + حالة «ملغى» خاصة.
  - جدول المنتوجات: `raw_text` (اسم المنتوج) · `quantity × unit_code · unit_price` · `line_total`.
  - مجاميع: المجموع الفرعي · الضريبة · **المجموع النهائي**.
  - زر «سيفط طلب جديد» → `/public/order`.

### ملاحظات العرض (StatusTimeline)
- Mapping عرضي فقط لحالات الـ backend الحقيقية (`new/needs_review/confirmed/reserved/preparing/fulfilled/cancelled`) → مراحل التوصيل (`DELIVERY_STAGES` فـ `lib/status.ts`)، عبر `statusMeta(status).stage`.
- **ما كيخترعش timestamps ولا transitions** — كيعرض الحالة الحالية والمراحل اللي دازت بلا تواريخ مفبركة.
- **ما كايناش مرحلة «خرج للتوصيل»** — تحيدت (ما عندها حالة backend مقابلة). الدليل دابا فيه **5 مراحل حقيقية** فقط.
- الحالة `cancelled` عندها كارط خاصة («الطلب ملغي»). أي حالة ما معروفة ⇒ كارط «الحالة الحالية: …» بلا تظاهر بتقدّم.

### البحث والخطأ
- إلا ناقص رقم الطلب أو الهاتف ماشي صحيح ⇒ رسالة تحقق: «اكتب رقم الطلب ورقم هاتف صحيح باش نلقاو الطلب ديالك».
- إلا ما لقاش الطلب ⇒ **رسالة خطأ واحدة عامة**: «ما لقيناش طلب بهاد الرقم ورقم الهاتف. تأكد من المعلومات وعاود المحاولة.» (ما كنرجعوش نص الـ backend الخام).

## الديزاين
- `PublicShell` مع زر «طلب جديد» فالـ header.
- بطاقة النموذج + بطاقة التفاصيل، `PageLoader` فالتحميل.
- الخطأ فالـ form عبر `FieldError` داخل منطقة `role="alert"`.

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** مباشر `/public/track` (بلا حساب) · شاشة نجاح [الطلب العمومي](12-public-order.md) (Prefill عبر `state.orderNumber`).
- **لفين كتمشي (Navigates to):** [الطلب العمومي](12-public-order.md) (زر «طلب جديد» / «سيفط طلب جديد»).
- **صفحات مرتبطة:** [الطلب العمومي](12-public-order.md) · backend `/public/orders/track`.
