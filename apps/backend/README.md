# AssetWise Partner Map — Backend

Fastify API ที่อ่านข้อมูลจาก PostgreSQL และให้บริการ frontend ผ่าน endpoints ต่อไปนี้:

- `GET /health`
- `GET /api/projects`
- `GET /api/partners`
- `GET /api/nearby`
- `GET /api/filters`

เริ่มใช้งานจากโฟลเดอร์ราก:

```bash
npm run dev:backend
```

กำหนด `DATABASE_URL`, `PORT`, `HOST` และ `FRONTEND_ORIGIN` ใน `.env` โดยใช้ `.env.example` เป็นต้นแบบ
