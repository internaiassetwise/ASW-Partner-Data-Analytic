# Phase 1 — Clean Summary (Gate 1)

Total rows: **974**


## Rows per entity_type

- `gov_bkk`: 437
- `partner_2026`: 167
- `partner`: 106
- `sponsor`: 91
- `gov_district`: 67
- `external_org`: 61
- `project`: 36
- `bank`: 9

## Rows per source_sheet

- `B2B` / `2026`: 167
- `B2B` / `ASW Partner`: 106
- `B2B` / `Bank`: 9
- `B2B` / `Sponsper`: 91
- `B2B` / `กลุ่มข้าราชการ กทม.`: 437
- `B2B` / `สำนักงานเขต`: 67
- `B2B` / `องค์กร ภายนอก`: 61
- `PROJECTS` / `Sheet1`: 36

## Geocode status before Phase 3

- already have lat/lng (projects): **36**
- need geocoding: **938**

## project_zone fill rate per entity_type

- `bank`: 0/9
- `external_org`: 0/61
- `gov_bkk`: 0/437
- `gov_district`: 0/67
- `partner`: 0/106
- `partner_2026`: 114/167
- `project`: 36/36
- `sponsor`: 0/91

## Address coverage (need for geocoding)

- `partner`: 106/106 have address
- `sponsor`: 90/91 have address
- `bank`: 9/9 have address
- `external_org`: 60/61 have address
- `partner_2026`: 167/167 have address
- `gov_bkk`: 437/437 have address
- `gov_district`: 67/67 have address
- `project`: 36/36 have address

## Duplicate external_id check

- no duplicates in output

### Duplicate rows dropped (same id, same content): 1

- `a1b964366dbe1f0b` บริษัท ไพร์ม แพ็คเกจจิ้ง จำกัด — kept องค์กร ภายนอก:11, dropped องค์กร ภายนอก:16

### Colliding ids suffixed (same id, different content): 0


## Sample rows (first 2 per entity_type)


### partner
- name=`บริษัท ชินวุธ มาร์เก็ตติ้ง จำกัด` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`0814282540`
- name=`บริษัท โปรเจค ไซน์(ประเทศไทย) จำกัด` city=`สมุทรปราการ` zone=`` lat=`` lng=`` phone=`0988959266`

### sponsor
- name=`บริษัท ที.โฟร์ คอนสตรัคชั่น จำกัด` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`0863604557`
- name=`บริษัท ธรรมสรณ์ จำกัด` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`0819255154`

### bank
- name=`ธนาคารไทยธนชาติ (TTB)` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`062-7979919`
- name=`ธนาคารกรุงศรี (BAY)` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`092-4533646`

### external_org
- name=`บริษัท บางกอกบรรจุภัณฑ์ จำกัด` city=`ปทุมธานี` zone=`` lat=`` lng=`` phone=``
- name=`บริษัท บีจี แพคเกจจิ้ง จำกัด สาขาอยุธยา ` city=`` zone=`` lat=`` lng=`` phone=`063-259-8269`

### partner_2026
- name=`บริษัท เอสซีบี เอกซ์ จำกัด (มหาชน) (SCBX` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`0-2180-8155. / 02 54`
- name=`บริษัทหลักทรัพย์จัดการกองทุน ไทยพาณิชย์ ` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`02 949 1500`

### gov_bkk
- name=`โรงเรียนชุมชนหมู่บ้านพัฒนา` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`0 2249 4499`
- name=`โรงเรียนวัดคลองเตย` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`0 2249 3412`

### gov_district
- name=`สำนักปลัดกรุงเทพมหานคร` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`0-2221-2141-69`
- name=`สำนักงานคณะกรรมการข้าราชการกรุงเทพมหานคร` city=`กรุงเทพมหานคร` zone=`` lat=`` lng=`` phone=`0 2224 3020, 0 2221 `

### project
- name=`เคฟ เอ็มบริโอ รังสิต` city=`` zone=`รังสิต` lat=`14.041302094472156` lng=`100.7338583` phone=``
- name=`แอทโมซ คาแนล รังสิต` city=`` zone=`รังสิต` lat=`13.984779678803662` lng=`100.60041386931279` phone=``