# AssetWise Partner Map

Monorepo สำหรับเว็บแผนที่พาร์ทเนอร์ AssetWise แยกส่วนแสดงผล, API และ data pipeline ออกจากกัน

## โครงสร้าง

```text
apps/frontend   Next.js, React และ Leaflet
apps/backend    Fastify API และ PostgreSQL
packages/shared TypeScript types ที่ใช้ร่วมกัน
pipeline        Python data cleaning, geocoding และ database load
```

## เริ่มใช้งานในเครื่อง

1. ติดตั้ง dependencies จากโฟลเดอร์ราก

   ```bash
   npm install
   ```

2. สร้างไฟล์ environment

   - คัดลอก `apps/backend/.env.example` เป็น `apps/backend/.env`
   - คัดลอก `apps/frontend/.env.example` เป็น `apps/frontend/.env.local`
   - ใส่ `DATABASE_URL` เฉพาะใน backend และ pipeline เท่านั้น

3. เปิด frontend และ backend พร้อมกัน

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:3000
   - Backend health check: http://localhost:4000/health

## คำสั่งสำคัญ

```bash
npm run dev
npm run build
npm run lint
npm run dev:frontend
npm run dev:backend
```

Frontend ส่งคำขอ `/api/*` ผ่าน Next.js rewrite ไปยัง backend โดยอ่านปลายทางจาก `API_BASE_URL` จึงไม่มีข้อมูลเชื่อมต่อฐานข้อมูลอยู่ใน browser bundle
