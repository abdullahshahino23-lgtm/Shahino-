# Shahino AI — مشروع موقع ولوحة تحكم

موقع عربي بتصميم أسود وذهبي مستوحى من التصميم المرفق، ويضم صفحة رئيسية وخدمات وأعمال ونموذج طلب خدمة ولوحة إدارة مرتبطة بـ Firebase Authentication وCloud Firestore.

## محتويات المشروع

- `index.html` — صفحات الموقع ولوحة الإدارة ونموذج التواصل.
- `styles.css` — التصميم المتجاوب للأجهزة المختلفة.
- `app.js` — منطق الواجهة وتسجيل الدخول وإدارة البيانات.
- `firebase-config.js` — إعدادات تطبيق Firebase (تحتاج تعبئة).
- `firestore.rules` — قواعد أمان Firestore.
- `.nojekyll` — تعطيل معالجة Jekyll على GitHub Pages.

## 1) إنشاء مشروع Firebase

1. افتح https://console.firebase.google.com/
2. أنشئ مشروعًا جديدًا باسم `Shahino AI` أو استخدم مشروعًا موجودًا.
3. من إعدادات المشروع، أضف تطبيق Web.
4. انسخ إعدادات Firebase الظاهرة في التطبيق إلى `firebase-config.js` بدل قيم `YOUR_...`.
5. من Authentication → Sign-in method، فعّل **Email/Password**.
6. من Authentication → Settings → Authorized domains، أضف نطاق GitHub Pages الخاص بك، مثل `USERNAME.github.io`.
7. من Firestore Database، أنشئ قاعدة بيانات. اختر موقعًا مناسبًا لقاعدة البيانات.
8. افتح تبويب Rules والصق محتوى `firestore.rules` ثم اضغط Publish.

> إعدادات Firebase الخاصة بتطبيق الويب تظهر في ملفات العميل بطبيعتها؛ لا تضع مفتاح خدمة Firebase Admin أو كلمات مرور أو أسرار خادم في المستودع. الأمان الحقيقي يعتمد على قواعد Firestore.

## 2) إنشاء أول مدير

1. افتح Firebase Console → Authentication → Users → Add user.
2. أدخل بريد المدير وكلمة مرور قوية. احفظ بيانات الدخول في مكان آمن.
3. بعد إنشاء المستخدم، انسخ قيمة **UID**.
4. افتح Firestore → Start collection أو Create collection، واسم المجموعة `admins`.
5. اجعل Document ID هو UID نفسه حرفيًا.
6. أضف الحقول:
   - `active` — Boolean — `true`
   - `name` — String — اسم المدير
7. احفظ الوثيقة.

مهم: أول مدير يجب إنشاؤه يدويًا من Firebase Console، لأن قواعد الأمان لا تسمح للزوار بترقية أنفسهم إلى مدير. بعد الدخول بحساب مدير، يمكنك إضافة وثائق صلاحيات لمديرين آخرين من لوحة المستخدمين، لكن يجب إنشاء حساباتهم في Authentication أولًا.

## 3) نشر المشروع على GitHub Pages

1. أنشئ مستودعًا عامًا جديدًا على GitHub باسم مثل `shahino-ai`.
2. ارفع ملفات المشروع الموجودة في هذا المجلد إلى جذر المستودع، بحيث يكون `index.html` في الجذر مباشرة.
3. افتح المستودع → Settings → Pages.
4. ضمن Build and deployment اختر:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/(root)`
5. اضغط Save وانتظر اكتمال النشر.
6. رابط الموقع غالبًا يكون:
   `https://USERNAME.github.io/shahino-ai/`
   استبدل `USERNAME` باسم حسابك و`shahino-ai` باسم المستودع.
7. أضف نطاق `USERNAME.github.io` إلى Authorized domains في Firebase Authentication.
8. افتح رابط الموقع واختبر نموذج الطلب وتسجيل دخول المدير.

## 4) كيف تعمل لوحة التحكم؟

- **نظرة عامة:** أعداد المشاريع والخدمات والطلبات وحسابات المديرين.
- **المشاريع:** إضافة وتعديل وحذف عناصر معرض الأعمال.
- **الخدمات:** إدارة أسماء الخدمات ووصفها وأسعارها.
- **الطلبات:** قراءة طلبات العملاء وتغيير الحالة إلى `new` أو `in_progress` أو `completed` أو `cancelled`.
- **المديرون:** إدارة وثائق صلاحيات المديرين، بعد إنشاء الحسابات في Authentication.
- **الإعدادات:** حفظ بيانات العلامة التجارية والنبذة وروابط التواصل في Firestore.

## 5) ملاحظات مهمة قبل الإطلاق

- لوحة الإدارة لا تظهر إلا بعد تسجيل الدخول والتحقق من وثيقة `admins/{UID}` وأن `active` تساوي `true`.
- الطلبات العامة لا يمكن قراءتها إلا بواسطة مدير، بينما يسمح للزائر بإنشاء طلب جديد وفق قيود الحقول في القواعد.
- هذا المشروع واجهة Frontend ثابتة؛ GitHub Pages لا يشغّل خادم Node.js أو API خاصة. إذا احتجت عمليات خادم سرية أو رسائل بريد تلقائية أو رفع ملفات خاص، أضف Cloud Functions أو خدمة خلفية آمنة.
- رفع صور المشاريع حاليًا عبر روابط صور؛ لا يوجد رفع ملفات مباشر. يمكن إضافة Firebase Storage لاحقًا مع قواعده.
- صفحة الإعدادات تحفظ القيم في Firestore، لكن تغيير بعض عناصر الصفحة العامة مباشرة من لوحة الإعدادات يحتاج ربطًا إضافيًا في الواجهة.
- اختبر القواعد في Firebase Rules Playground أو Emulator قبل استخدام بيانات حساسة.
- للحصول على فهارس مطلوبة عند ظهور رسالة من Firestore، اتبع رابط إنشاء الفهرس الذي تعرضه رسالة الخطأ.

## 6) تحديث الموقع لاحقًا

عدّل الملفات محليًا أو مباشرة من GitHub، ثم ارفع التعديلات إلى فرع `main`. سيعيد GitHub Pages بناء الموقع تلقائيًا خلال وقت قصير.

## روابط مفيدة

- Firebase Console: https://console.firebase.google.com/
- GitHub Pages: https://docs.github.com/pages
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Firebase Authentication: https://firebase.google.com/docs/auth
