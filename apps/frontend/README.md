# AssetWise Partner Map — Frontend

Next.js frontend สำหรับแสดงแผนที่และตัวกรองพาร์ทเนอร์ ไม่มีการเชื่อมต่อฐานข้อมูลโดยตรง

```bash
npm run dev --workspace @asw/frontend
```

คำขอ `/api/*` จะถูก proxy ไป backend ตามค่า `API_BASE_URL` ใน `.env.local`
