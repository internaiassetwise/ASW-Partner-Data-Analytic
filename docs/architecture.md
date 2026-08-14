# Architecture

```text
Browser
  |
  | http://localhost:3000/api/*
  v
Next.js frontend (apps/frontend)
  |
  | rewrite -> API_BASE_URL
  v
Fastify backend (apps/backend)
  |
  v
PostgreSQL
  ^
  |
Python pipeline (pipeline)
```

## ขอบเขตความรับผิดชอบ

- `apps/frontend`: UI, แผนที่, state และ client-side filtering
- `apps/backend`: HTTP API, query validation และ database access
- `packages/shared`: TypeScript contracts ที่ frontend และ backend ใช้ร่วมกัน
- `pipeline`: งาน batch สำหรับ clean, geocode, enrich และ load ข้อมูล

Frontend ไม่มี `DATABASE_URL` และไม่เชื่อม PostgreSQL โดยตรง การเรียก `/api/*` ใช้ same-origin URL แล้วให้ Next.js proxy ไป backend เพื่อลดการตั้งค่า CORS ใน browser
