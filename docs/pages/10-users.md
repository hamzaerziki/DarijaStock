# 10. المستخدمين — Users

- **الملف:** `frontend/src/pages/Users.tsx`
- **الراوت:** `/users`
- **الصلاحية:** `manage_users`
- **API:** `GET /users` (كيرجع `User[]` خام، ماشي paginated) · `POST /users` · `PATCH /users/{id}`.
- **عنوان الصفحة:** `DarijaStock — المستخدمين`.

## المحتوى
تدبير حسابات المستخدمين والأدوار من طرف الأدمن (إنشاء/تعديل، تفعيل/إيقاف، تعيين كلمة سر).

### الأعمدة (`DataTable`)
| العمود | الحقل | الأولوية |
|--------|-------|---------|
| الإيميل | `email` (code, dir=ltr) | primary |
| الاسم | `full_name` | — |
| الدور | `role` → `roleLabel()` (navy Badge) | — |
| الحالة | `is_active` → أخضر «نشط» / أحمر «موقوف» | badge |

### الأدوار (من `ROLE_LABELS` فـ `lib/labels.ts`)
| القيمة | Label |
|--------|-------|
| `admin` | مدير النظام |
| `order_operator` | عامل الكوموندات |
| `stock_manager` | مسؤول الستوك |
| `order_approver` | مصادق الكوموندات |
| `invoice_operator` | عامل الفوترة |
| `read_only` | قراءة فقط |

تحت الـ Select كيفتح نص مساعد من `ROLE_DESCRIPTIONS` كيشرح الدور المختار.

### حقول النموذج (`UserDialog`, sm)
- «البريد الإلكتروني» (required، عند الإنشاء فقط، `type=email`, dir=ltr)
- «الاسم الكامل» (required)
- «الدور» (required) — Select للأدوار الستة، افتراضي `read_only` + وصف الدور
- «كلمة السر» (إنشاء) / «كلمة سر جديدة (اختياري)» (تعديل) — placeholder «على الأقل 8 حروف» + **زر إظهار/إخفاء** (Eye/EyeOff مع `aria-pressed`)
- Checkbox «الحساب نشط» (`is_active`)
- `FieldError` inline عند الفشل.

### التحقق (client-side، قبل الإرسال)
- الاسم الكامل معمّر.
- عند الإنشاء: الإيميل معمّر + مطابق لـ `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- كلمة السر: على الأقل **8 حروف** عند الإنشاء، وإلا كانت معمّرة عند التعديل.

### الحماية الذاتية (self-protection)
ملي كيعدّل المستخدم **الحساب ديالو** (`isSelf = editing.id === me.id`):
- كيبان تنبيه بأيقونة ShieldAlert: «ما يمكنش تبدل الدور أو توقف الحساب ديالك بوحدك.»
- الـ Select ديال الدور والـ checkbox `is_active` كيتعطّلو، والـ PATCH كيصيفط `role: undefined` و `is_active: undefined` (كيبدّل غير الاسم/كلمة السر).

> ملاحظة: هادي حماية **واجهة فقط** — الـ backend ما كيديرش هاد المنع.

## الفلاتر / الأفعال
- **بلا فلاتر ولا pagination** (لائحة كاملة).
- رأس الصفحة «مستخدم جديد» (UserPlus) → Dialog وضع الإنشاء.
- صف «تعديل» → Dialog وضع التعديل.
- حفظ (إنشاء): `POST /users` بـ `{email, full_name, role, is_active, password}` → toast «تم إنشاء المستخدم».
- حفظ (تعديل): `PATCH /users/{id}` بـ `{full_name, role?, is_active?, password?}` → toast «تم التعديل».
- الحفظ كيدوز على `useSubmitLock` (`loading={busy}` + تعطيل «إلغاء») ضد الإرسال المزدوج.
- **بلا حذف** — الإيقاف كيوقع عبر الـ checkbox `is_active` فالتعديل.

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** sidebar «المستخدمين» (بصلاحية `manage_users`).
- **لفين كتمشي (Navigates to):** — (Dialog محلي، بلا تنقل).
- **صفحات مرتبطة:** [الهيكل المشترك](README.md) (الأدوار/الصلاحيات كتحكم ظهور الـ sidebar) · [تسجيل الدخول](11-login.md).
