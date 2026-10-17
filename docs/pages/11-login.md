# 11. تسجيل الدخول — Login

- **الملف:** `frontend/src/pages/Login.tsx`
- **الراوت:** `/login` (خارج `Layout` — صفحة مستقلة)
- **الصلاحية:** عامة (بلا حساب ما كتدخلش للتطبيق).
- **API:** عبر `useAuth().login(email, password)` (بلا مباشرة فالمكوّن).
- **عنوان الصفحة:** `DarijaStock — تسجيل الدخول`.

## المحتوى
نموذج دخول: البريد الإلكتروني + كلمة المرور، زر «دخول»، ورسالة خطأ عند الفشل.

- **منطق:** `onSubmit` → `login(email,password)` → toast نجاح «تسجيل الدخول تم بنجاح / Connexion réussie» → `navigate(from, { replace: true })`. عند الخطأ: `apiError(e)` كيولّي `err` + toast خطأ.
- **وجهة ما بعد الدخول (`from`)** بالأولوية: `?next=` (كيتحط من الـ 401 interceptor فـ `lib/api.ts`) ← بعدها `location.state.from` (من `ProtectedRoute`) ← وأخيراً `/`. هادشي كيرجّع المستخدم للصفحة اللي كان باغيها قبل ما يطيح التوكن.
- **Validation:** `required` على الحقلين + `type=email` + autocomplete (`username` / `current-password`) + `autoFocus` على الإيميل.
- **إظهار/إخفاء كلمة المرور:** زر داخل الحقل (Eye/EyeOff مع `aria-pressed` و `aria-label`).
- **منع الإرسال المزدوج:** الزر كيدوز على `useSubmitLock` (`loading={busy}`).
- **رسالة الخطأ:** داخل منطقة `aria-live="polite"`.
- نص مساعد: «نسيت كلمة السر؟ تواصل مع المسؤول ديال النظام».

## الديزاين (إعادة تصميم)
- **Split-screen** على الديسكتوب (`lg:grid-cols-2`) على خلفية **navy** (#102B46) مع تدرّج دوائر خفيف:
  - **لوحة الهوية (يمين RTL):** لوجو Store + اسم DarijaStock + عنوان «كل الكوموندات والستوك فبلاصة وحدة» + 4 نقاط ميزة (ClipboardList/Package/BarChart3/ShieldCheck) + footer.
  - **لوحة النموذج (يسار RTL):** بطاقة بيضاء (radius 2xl, shadow-card) فيها «مرحبا بيك من جديد»، حقلان بأيقونات (Mail/Lock)، زر «دخول» بعرض كامل، ورقم سفلي.
- **الموبايل:** لوحة الهوية مخفية، لوجو مركزي فوق + نفس النموذج، ورقم سفلي.
- التوكنز: خلفية `bg-navy` / `bg-background`، primary للزر والأيقونات، `h-11` لحقول الإدخال.

## Relations (العلاقات)

- **من فين كتدخل (Entry points):** أول صفحة بعد فتح التطبيق · بعد «تسجيل الخروج» · بعد 401 (مع `?next=`) · من `ProtectedRoute` (مع `state.from`).
- **لفين كتمشي (Navigates to):** الوجهة `from` (`?next` أو `state.from` أو `/`) → غالباً [لوحة القيادة](01-dashboard.md).
- **صفحات مرتبطة:** كل الصفحات الإدارية (محمية بـ `ProtectedRoute`) · [الطلب العمومي](12-public-order.md) (عام بلا دخول).
