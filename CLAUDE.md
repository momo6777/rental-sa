# نظام إدارة تأجير العقارات — السوق السعودي

## قواعد صارمة لا تُكسر أبداً

### ❌ محظور تماماً
- لا تشغّل أي dev server (`npm run dev`, `vite`, `next dev`, etc.)
- لا تستخدم `localhost` أو `127.0.0.1` في أي مكان
- لا تشغّل `nodemon` أو أي watcher
- لا تفتح browser أو تحاول preview محلي
- لا تكتب credentials في الكود مباشرة

### ✅ البدائل المطلوبة
- **DB changes** → `npx supabase db push` فقط
- **Test logic** → سكريبتات Node.js مستقلة (`node scripts/test-xyz.js`)
- **Build check** → `npm run build` للتحقق من الـ TypeScript والبناء
- **Frontend** → Vercel يعمل deploy تلقائي على كل push
- **API testing** → استخدم Supabase JS client مباشرة في سكريبتات

---

## معمارية المشروع

```
Frontend (React + Vite)
        │
        ▼
Supabase JS Client
        │
   ┌────┴────┐
   │         │
Supabase   Supabase
  DB        Auth + Storage
(PostgreSQL)
```

---

## Stack التقني

| الطبقة       | الأداة              | ملاحظة                        |
|-------------|---------------------|-------------------------------|
| Frontend    | React + TypeScript  | Vite للبناء فقط               |
| UI Library  | Ant Design (antd)   | دعم RTL كامل                  |
| State       | Zustand             | خفيف وبسيط                    |
| DB + API    | Supabase            | PostgreSQL hosted              |
| Auth        | Supabase Auth       | Email/Password + OTP           |
| Storage     | Supabase Storage    | صور العقارات، الوثائق، الصكوك |
| Hosting     | Vercel              | Auto-deploy من GitHub          |
| Email       | Resend              | إشعارات وفواتير               |
| PDF         | @react-pdf/renderer | فواتير + عقود                 |

---

## متغيرات البيئة المطلوبة (.env.local)

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx   # للسكريبتات فقط، لا يُرفع للـ frontend
RESEND_API_KEY=xxxx
VITE_APP_NAME=نظام إدارة العقارات
VITE_VAT_RATE=0.15
```

---

## هيكل المجلدات

```
rental-sa/
├── CLAUDE.md                  ← هذا الملف
├── .env.local                 ← لا يُرفع لـ git أبداً
├── .env.example               ← نموذج بدون قيم حقيقية
├── package.json
├── vite.config.ts
│
├── supabase/
│   ├── migrations/            ← كل تغيير في DB يكون ملف هنا
│   │   ├── 001_initial.sql
│   │   ├── 002_contracts.sql
│   │   └── ...
│   └── seed.sql               ← بيانات تجريبية
│
├── scripts/                   ← سكريبتات اختبار مستقلة (Node.js)
│   ├── test-supabase.js       ← تحقق من الاتصال
│   ├── seed-properties.js     ← إدخال بيانات تجريبية
│   └── test-vat-calc.js       ← اختبار حسابات الضريبة
│
└── src/
    ├── lib/
    │   ├── supabase.ts        ← Supabase client
    │   ├── vatCalculator.ts   ← حسابات VAT 15%
    │   └── zakatReport.ts     ← تقارير الزكاة
    │
    ├── types/
    │   └── index.ts           ← كل TypeScript types هنا
    │
    ├── hooks/                 ← React hooks للـ Supabase
    │   ├── useProperties.ts
    │   ├── useContracts.ts
    │   └── usePayments.ts
    │
    ├── components/
    │   ├── properties/        ← مكونات العقارات
    │   ├── contracts/         ← مكونات العقود
    │   ├── payments/          ← مكونات المدفوعات
    │   ├── maintenance/       ← مكونات الصيانة
    │   └── reports/           ← مكونات التقارير
    │
    └── pages/
        ├── Dashboard.tsx
        ├── Properties.tsx
        ├── Contracts.tsx
        ├── Payments.tsx
        ├── Maintenance.tsx
        └── Reports.tsx
```

---

## جداول قاعدة البيانات الرئيسية

### جدول العقارات `properties`
```sql
id, name_ar, name_en, type (residential/commercial),
city, district, parcel_number, deed_number,
total_units, created_at
```

### جدول الوحدات `units`
```sql
id, property_id, unit_number, floor, area_sqm,
type (apartment/office/shop/villa),
status (available/rented/maintenance),
rent_price, created_at
```

### جدول المستأجرين `tenants`
```sql
id, full_name_ar, full_name_en, national_id,
iqama_number, nationality, phone, email,
absher_verified, created_at
```

### جدول العقود `contracts`
```sql
id, unit_id, tenant_id, start_date, end_date,
rent_amount, payment_frequency (monthly/quarterly/yearly),
status (active/expired/terminated),
ejar_contract_number,  ← رقم العقد في منصة إيجار
vat_included, deposit_amount, created_at
```

### جدول المدفوعات `payments`
```sql
id, contract_id, amount, vat_amount, total_amount,
due_date, paid_date, status (pending/paid/overdue),
payment_method (sadad/transfer/cash),
sadad_reference, invoice_number, created_at
```

### جدول الصيانة `maintenance_requests`
```sql
id, unit_id, title, description, priority (low/medium/high/urgent),
status (open/in_progress/completed),
reported_by, assigned_to, cost, completed_at, created_at
```

---

## قواعد المنطق التجاري

### ضريبة القيمة المضافة (VAT)
```typescript
const VAT_RATE = 0.15;
// الإيجار السكني → معفى من VAT
// الإيجار التجاري → خاضع لـ VAT 15%
function calcVAT(amount: number, isCommercial: boolean) {
  if (!isCommercial) return { base: amount, vat: 0, total: amount };
  const vat = amount * VAT_RATE;
  return { base: amount, vat, total: amount + vat };
}
```

### رقم الفاتورة
```
INV-{YYYY}-{MM}-{sequence:5d}
مثال: INV-2025-05-00123
```

### تنبيه انتهاء العقد
- 90 يوم قبل الانتهاء → تنبيه أول
- 30 يوم قبل الانتهاء → تنبيه عاجل

---

## طريقة العمل مع Supabase

### كتابة migration جديد
```bash
# أنشئ ملف migration
touch supabase/migrations/003_add_maintenance.sql

# اكتب الـ SQL في الملف
# ثم طبّقه
npx supabase db push
```

### اختبار استعلام
```javascript
// scripts/test-properties.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from('properties').select('*');
  console.log({ data, error });
}

test();
// تشغيل: node scripts/test-properties.js
```

---

## Supabase Row Level Security (RLS)

كل جدول لازم يكون عنده RLS policies:
- المدير: يشوف ويعدل كل شيء
- المحاسب: يشوف كل شيء + يعدل المدفوعات والتقارير فقط
- القراءة: مش مسموح بدون تسجيل دخول

```sql
-- مثال على policy للمحاسب
CREATE POLICY "accountant_read_all" ON payments
  FOR SELECT USING (auth.jwt() ->> 'role' = 'accountant');

CREATE POLICY "accountant_update_payments" ON payments
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('admin', 'accountant'));
```

---

## متطلبات خاصة بالسوق السعودي

1. **منصة إيجار**: كل عقد لازم يُسجَّل وترجع `ejar_contract_number`
2. **ZATCA**: فاتورة إلكترونية بـ QR code لكل دفعة تجارية
3. **SADAD**: مدفوعات عبر شبكة SADAD
4. **Absher**: التحقق من هوية المستأجر
5. **اللغة**: عربي أساسي، إنجليزي ثانوي — `dir="rtl"` دايماً

---

## أوامر مفيدة

```bash
npm run build          # تحقق من TypeScript + build
npx supabase db push   # طبّق migrations الجديدة
npx supabase db reset  # reset DB وأعد الـ seed (تطوير فقط)
node scripts/seed-properties.js   # أدخل بيانات تجريبية
```
