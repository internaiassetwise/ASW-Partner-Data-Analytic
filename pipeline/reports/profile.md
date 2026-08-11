# Phase 1 — Data Profile

## File: `ฐานข้อมูลรายชื่อ B2B.xlsx`

### Sheet: `ASW Partner`
- max_row (reported): **110**, real columns with data: **20/16367**
- header detected at row **2**
- data rows: **108** total, **106** non-empty

**Headers:**
`ลำดับ` | `Email` | `Supplier Name` | `Street` | `City` | `Contact Person` | `Telephone` | `จำนวนพนักงาน Head office` | `Remark` | `วันที่เข้าร่วม` | `Follow` | `สื่อสารผ่านระบบ Intranet` | `Company- wide email [EDM]` | `Line บริษัท` | `Standee` | `Poster ` | `Booth` | `Leaflet ใบปลิว` | `col_19` | `col_20`

**Column fill rate** (non-empty / total):
```
column                     filled  null%  
------------------------------------------
ลำดับ                      106     0.0    
Email                      105     0.9    
Supplier Name              106     0.0    
Street                     106     0.0    
City                       106     0.0    
Contact Person             105     0.9    
Telephone                  105     0.9    
จำนวนพนักงาน Head office   26      75.5   
Remark                     102     3.8    
วันที่เข้าร่วม             106     0.0    
Follow                     3       97.2   
สื่อสารผ่านระบบ Intranet   0       100.0  
Company- wide email [EDM]  9       91.5   
Line บริษัท                7       93.4   
Standee                    0       100.0  
Poster                     3       97.2   
Booth                      2       98.1   
Leaflet ใบปลิว             2       98.1   
col_19                     19      82.1   
col_20                     16      84.9   
```

**Sample (first 3 data rows, truncated):**
```
ลำดับ  Email                                     Supplier Name                        Street                             City           Contact Person                  Telephone   จำนวนพนักงาน Head office  Remark                                    วันที่เข้าร่วม       Follow            สื่อสารผ่านระบบ Intranet  Company- wide email [EDM]  Line บริษัท  Standee  Poster   Booth  Leaflet ใบปลิว  col_19                     col_20                                    
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
1      prateep@chinavut.com, marketing3@chinavu  บริษัท ชินวุธ มาร์เก็ตติ้ง จำกัด     เลขที่ 63,65,67 ซอยรุ่งเรือง       กรุงเทพมหานคร  ประทีป อมรดิษฐ์                 0814282540  60                        ส่งเมล์ใหม่ที่ marketing3@chinavut.com    2025-03-01 00:00:00  Mail Add Line OA                                                                                                             มี sponsper งานBeauty Run  ส่งเมล์และCC คุณประทีป มีน้องในบริษัทสนใ  
2      center.projectsign@gmail.com              บริษัท โปรเจค ไซน์(ประเทศไทย) จำกัด  เลขที่ 195 หมู่ 6                  สมุทรปราการ    ปลายจันทร์ กัญญาพชรพรชัย (เอ๊ะ  0988959266                            ให้ส่งข้อมูลทางเมล์อีกรอบ สนใจ center.pr  2025-03-01 00:00:00  Mail Add Line OA                                                                                                                                                                                  
3      payin.engineering@gmail.com               บริษัท จีระธนา เอ็นจิเนียริ่ง จำกัด  เลขที่ 109/37 ซอยพระยาสุเรนทร์ 35  กรุงเทพมหานคร  จิราภรณ์                        0863083800                            คุณกร สนใจจะติดต่อกลับมดเอง payin.engine  2025-03-01 00:00:00                                                                                                                                                                                                    
```

### Sheet: `Sponsper`
- max_row (reported): **97**, real columns with data: **17/17**
- header detected at row **2**
- data rows: **95** total, **92** non-empty

**Headers:**
`ลำดับ` | `Email` | `Supplier Name` | `Street` | `City` | `Contact Person` | `Telephone` | `จำนวนพนักงาน Head Office` | `Remark` | `วันที่เข้าร่วม` | `สื่อสารผ่านระบบ Intranet` | `Company - Wide email [EDM]` | `Line บริษัท ` | `Standee` | `Poster` | `Booth` | `ใบปลิว`

**Column fill rate** (non-empty / total):
```
column                      filled  null%  
-------------------------------------------
ลำดับ                       91      1.1    
Email                       77      16.3   
Supplier Name               92      0.0    
Street                      90      2.2    
City                        90      2.2    
Contact Person              77      16.3   
Telephone                   73      20.7   
จำนวนพนักงาน Head Office    24      73.9   
Remark                      8       91.3   
วันที่เข้าร่วม              81      12.0   
สื่อสารผ่านระบบ Intranet    1       98.9   
Company - Wide email [EDM]  8       91.3   
Line บริษัท                 9       90.2   
Standee                     0       100.0  
Poster                      0       100.0  
Booth                       0       100.0  
ใบปลิว                      0       100.0  
```

**Sample (first 3 data rows, truncated):**
```
ลำดับ  Email                    Supplier Name                             Street                     City           Contact Person          Telephone   จำนวนพนักงาน Head Office  Remark  วันที่เข้าร่วม       สื่อสารผ่านระบบ Intranet  Company - Wide email [EDM]  Line บริษัท   Standee  Poster  Booth  ใบปลิว  
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
1      t4construction@live.com  บริษัท ที.โฟร์ คอนสตรัคชั่น จำกัด         เลขที่ 9 ซอยบางแวก 156     กรุงเทพมหานคร  ยุทธชัย รัชดาภรณ์วานิช  0863604557  80                                2025-07-01 00:00:00                            Company - Wide email [EDM]  Line กลุ่ม                                    
2      kornlika@dos.co.th       บริษัท ธรรมสรณ์ จำกัด                     เลขที่ 156/20              กรุงเทพมหานคร  กรลิกา สันเทียะ         0819255154  เบอร์ติดต่อไม่ได้                                                                                                                                          
3      ac.ar@lighttrio.com      อิทธิฤทธิ์ ไนซ์ คอร์ปอเรชั่น จำกัด (มหาช  เลขที่ 89/18-19 หมู่ที่ 5  สมุทรสาคร      เสาวลักษณ์ ทองงาม       0849762924  94                                2025-07-01 00:00:00                            Company - Wide email [EDM]                                                
```

### Sheet: `Bank`
- max_row (reported): **15**, real columns with data: **17/21**
- header detected at row **2**
- data rows: **13** total, **10** non-empty

**Headers:**
`ลำดับ` | `Email` | `Bank Name` | `Street` | `City` | `Salesperson` | `Telephone` | `จำนวนพนักงาน Head office` | `Remark` | `วันที่เข้าร่วม` | `สื่อสารผ่านระบบ Intranet` | `Company- wide email [EDM]` | `Line บริษัท` | `Standee` | `Poster ` | `Booth` | `Leaflet ใบปลิว`

**Column fill rate** (non-empty / total):
```
column                     filled  null%  
------------------------------------------
ลำดับ                      10      0.0    
Email                      8       20.0   
Bank Name                  9       10.0   
Street                     9       10.0   
City                       9       10.0   
Salesperson                9       10.0   
Telephone                  8       20.0   
จำนวนพนักงาน Head office   8       20.0   
Remark                     9       10.0   
วันที่เข้าร่วม             9       10.0   
สื่อสารผ่านระบบ Intranet   9       10.0   
Company- wide email [EDM]  9       10.0   
Line บริษัท                2       80.0   
Standee                    1       90.0   
Poster                     1       90.0   
Booth                      5       50.0   
Leaflet ใบปลิว             1       90.0   
```

**Sample (first 3 data rows, truncated):**
```
ลำดับ  Email                        Bank Name                      Street                                    City      Salesperson  Telephone    จำนวนพนักงาน Head office  Remark                             วันที่เข้าร่วม       สื่อสารผ่านระบบ Intranet  Company- wide email [EDM]  Line บริษัท  Standee  Poster   Booth              Leaflet ใบปลิว  
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
1      siriluk.ler@ttbbank.com      ธนาคารไทยธนชาติ (TTB)          3000 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กร  กรุงเทพฯ  คุณบิ๋ม      062-7979919  700                       ประจำสำนักงานใหญ่                  2025-03-01 00:00:00   Intranet support         Company- wide email [EDM]                                 Booth ภายในองค์กร                  
2      Patitta.Jantra@krungsri.com  ธนาคารกรุงศรี (BAY)            1222 ถ. พระรามที่ 3 แขวงบางโพงพาง เขตยาน  กรุงเทพฯ  คุณแอน       092-4533646  3000                      พนักงานประจำ  เข้าสำนักงาน 50-70%  2025-03-01 00:00:00   Intranet support         Company- wide email [EDM]                                 Booth ภายในองค์กร                  
3      pomporn.t@ghb.co.th          ธนาคารอาคารสงเคราะห์ (GHBank)  63 ถนนพระราม 9 เขตห้วยขวาง กรุงเทพมหานคร  กรุงเทพฯ  คุณฝน        093-6622644  5000                      พนักงานประจำ  เข้าสำนักงาน 50-70%  2025-05-01 00:00:00   -                        Company- wide email [EDM]                                                                    
```

### Sheet: `องค์กร ภายนอก`
- max_row (reported): **103**, real columns with data: **17/86**
- header detected at row **2**
- data rows: **101** total, **64** non-empty

**Headers:**
`ลำดับ` | `Email` | `Partners Name` | `Street` | `City` | `Contact Person` | `Telephone` | `จำนวนพนักงาน Head office` | `Remark` | `วันที่เข้าร่วม` | `สื่อสารผ่านระบบ Intranet` | `Company- wide email [EDM]` | `Line บริษัท` | `Standee` | `Poster ` | `Booth` | `Leaflet ใบปลิว`

**Column fill rate** (non-empty / total):
```
column                     filled  null%  
------------------------------------------
ลำดับ                      49      23.4   
Email                      36      43.8   
Partners Name              62      3.1    
Street                     61      4.7    
City                       47      26.6   
Contact Person             27      57.8   
Telephone                  35      45.3   
จำนวนพนักงาน Head office   41      35.9   
Remark                     57      10.9   
วันที่เข้าร่วม             33      48.4   
สื่อสารผ่านระบบ Intranet   3       95.3   
Company- wide email [EDM]  34      46.9   
Line บริษัท                0       100.0  
Standee                    0       100.0  
Poster                     1       98.4   
Booth                      1       98.4   
Leaflet ใบปลิว             0       100.0  
```

**Sample (first 3 data rows, truncated):**
```
ลำดับ  Email                      Partners Name                             Street                                    City      Contact Person  Telephone     จำนวนพนักงาน Head office  Remark                 วันที่เข้าร่วม       สื่อสารผ่านระบบ Intranet  Company- wide email [EDM]  Line บริษัท  Standee  Poster   Booth              Leaflet ใบปลิว  
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
1                                 บริษัท บางกอกบรรจุภัณฑ์ จำกัด             47 1 ถนนรังสิต - นครนายก ตำบล บึงยี่โถ อ  ปทุมธานี  คุณอ้อ                        4500                      กลุ่มบริษัทในเครือ BG  2025-05-01 00:00:00   Intranet support         Company-wide email                                        Booth ภายในองค์กร                  
2      Anussayaar.K@bgiglass.com  บริษัท บีจี แพคเกจจิ้ง จำกัด สาขาอยุธยา   47 1 ถนนรังสิต - นครนายก ตำบล บึงยี่โถ อ            คุณเตย          063-259-8269                            กลุ่มบริษัทในเครือ BG  2025-05-01 00:00:00                                                                                                                         
3      soranan.a@bgc.co.th        บริษัท บางกอกกล๊าส จำกัด (มหาชน)          47 1 ถนนรังสิต - นครนายก ตำบล บึงยี่โถ อ                                                                    กลุ่มบริษัทในเครือ BG  2025-05-01 00:00:00                                                                                                                         
```

### Sheet: `2026`
- max_row (reported): **224**, real columns with data: **19/19**
- header detected at row **2**
- data rows: **222** total, **202** non-empty

**Headers:**
`ลำดับ` | `Email` | `Partners Name` | `Address` | `City` | `Contact Person` | `Line ID` | `Telephone` | `จำนวนพนักงาน Head office` | `Remark` | `วันที่เข้าร่วม` | `สื่อสารผ่านระบบ Intranet` | `Company- wide email [EDM]` | `Line บริษัท` | `Standee` | `Poster ` | `Booth` | `Leaflet ใบปลิว` | `In zone Project`

**Column fill rate** (non-empty / total):
```
column                     filled  null%  
------------------------------------------
ลำดับ                      202     0.0    
Email                      79      60.9   
Partners Name              166     17.8   
Address                    166     17.8   
City                       166     17.8   
Contact Person             35      82.7   
Line ID                    8       96.0   
Telephone                  140     30.7   
จำนวนพนักงาน Head office   38      81.2   
Remark                     80      60.4   
วันที่เข้าร่วม             25      87.6   
สื่อสารผ่านระบบ Intranet   26      87.1   
Company- wide email [EDM]  28      86.1   
Line บริษัท                5       97.5   
Standee                    0       100.0  
Poster                     2       99.0   
Booth                      3       98.5   
Leaflet ใบปลิว             0       100.0  
In zone Project            114     43.6   
```

**Sample (first 3 data rows, truncated):**
```
ลำดับ  Email                          Partners Name                             Address                                   City           Contact Person       Line ID  Telephone                                 จำนวนพนักงาน Head office  Remark  วันที่เข้าร่วม       สื่อสารผ่านระบบ Intranet  Company- wide email [EDM]  Line บริษัท  Standee  Poster   Booth  Leaflet ใบปลิว  In zone Project  
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
1      vareedhorn.piromnam@scb.co.th  บริษัท เอสซีบี เอกซ์ จำกัด (มหาชน) (SCBX  9 ถนนรัชดาภิเษก แขวงจตุจักร เขตจตุจักร ก  กรุงเทพมหานคร  คุณนุด ฝ่าย Product           0-2180-8155. / 02 544 2095 / 0867028929                                     1969-01-01 00:00:00   Intranet support         Company-wide email [EDM]                                                                          
2      peopleweb@scb.co.th            บริษัทหลักทรัพย์จัดการกองทุน ไทยพาณิชย์   ไทยพาณิชย์ ปาร์ค พลาซ่า อาคาร 1 ชั้น 7-8  กรุงเทพมหานคร                                02 949 1500                                                                 1969-01-01 00:00:00   Intranet support         Company-wide email [EDM]                                                                          
3                                     บริษัทหลักทรัพย์ อินโนเวสท์ เอ็กซ์ จำกัด  ไทยพาณิชย์ ปาร์ค พลาซ่า เลขที่ 18 อาคาร   กรุงเทพมหานคร                                                                                                            1969-01-01 00:00:00   Intranet support         Company-wide email [EDM]                                                                          
```

### Sheet: `กลุ่มข้าราชการ กทม.`
- max_row (reported): **438**, real columns with data: **17/86**
- header detected at row **1**
- data rows: **437** total, **437** non-empty

**Headers:**
`ลำดับ` | `Email` | `Partners Name` | `Street` | `City` | `Contact Person` | `Telephone` | `จำนวนบุคลากร` | `Remark` | `วันที่เข้าร่วม` | `สื่อสารผ่านระบบ Intranet` | `Company- wide email [EDM]` | `Line บริษัท` | `Standee` | `Poster ` | `Booth` | `Leaflet ใบปลิว`

**Column fill rate** (non-empty / total):
```
column                     filled  null%  
------------------------------------------
ลำดับ                      437     0.0    
Email                      437     0.0    
Partners Name              437     0.0    
Street                     437     0.0    
City                       437     0.0    
Contact Person             0       100.0  
Telephone                  436     0.2    
จำนวนบุคลากร               0       100.0  
Remark                     0       100.0  
วันที่เข้าร่วม             437     0.0    
สื่อสารผ่านระบบ Intranet   0       100.0  
Company- wide email [EDM]  0       100.0  
Line บริษัท                0       100.0  
Standee                    0       100.0  
Poster                     0       100.0  
Booth                      0       100.0  
Leaflet ใบปลิว             0       100.0  
```

**Sample (first 3 data rows, truncated):**
```
ลำดับ  Email                           Partners Name               Street                                    City      Contact Person  Telephone    จำนวนบุคลากร  Remark  วันที่เข้าร่วม       สื่อสารผ่านระบบ Intranet  Company- wide email [EDM]  Line บริษัท  Standee  Poster   Booth  Leaflet ใบปลิว  
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
1      21404@edu.bangkok.go.th         โรงเรียนชุมชนหมู่บ้านพัฒนา  160/507 ล็อค 6  แขวงคลองเตย  เขตคลองเตย   กรุงเทพฯ                  0 2249 4499                        1969-05-02 00:00:00                                                                                                             
2      watklongtoieschool@hotmail.com  โรงเรียนวัดคลองเตย          386  ถ.สุนทรโกษา  แขวงคลองเตย  เขตคลองเต  กรุงเทพฯ                  0 2249 3412                        1969-05-02 00:00:00                                                                                                             
3      watsaphanschool@gmail.com       โรงเรียนวัดสะพาน            1730  แขวงพระโขนง  เขตคลองเตย  กทม.       กรุงเทพฯ                  0 2311 5120                        1969-05-02 00:00:00                                                                                                             
```

### Sheet: `สำนักงานเขต`
- max_row (reported): **68**, real columns with data: **17/86**
- header detected at row **1**
- data rows: **67** total, **67** non-empty

**Headers:**
`ลำดับ` | `Email` | `Partners Name` | `Street` | `City` | `Contact Person` | `Telephone` | `จำนวนบุคลากร` | `Remark` | `วันที่เข้าร่วม` | `สื่อสารผ่านระบบ Intranet` | `Company- wide email [EDM]` | `Line บริษัท` | `Standee` | `Poster ` | `Booth` | `Leaflet ใบปลิว`

**Column fill rate** (non-empty / total):
```
column                     filled  null%  
------------------------------------------
ลำดับ                      67      0.0    
Email                      66      1.5    
Partners Name              67      0.0    
Street                     67      0.0    
City                       67      0.0    
Contact Person             3       95.5   
Telephone                  67      0.0    
จำนวนบุคลากร               0       100.0  
Remark                     1       98.5   
วันที่เข้าร่วม             0       100.0  
สื่อสารผ่านระบบ Intranet   0       100.0  
Company- wide email [EDM]  0       100.0  
Line บริษัท                0       100.0  
Standee                    0       100.0  
Poster                     0       100.0  
Booth                      0       100.0  
Leaflet ใบปลิว             0       100.0  
```

**Sample (first 3 data rows, truncated):**
```
ลำดับ  Email                                     Partners Name                             Street                                    City           Contact Person  Telephone                    จำนวนบุคลากร  Remark  วันที่เข้าร่วม  สื่อสารผ่านระบบ Intranet  Company- wide email [EDM]  Line บริษัท  Standee  Poster   Booth  Leaflet ใบปลิว  
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
1      saraban.ops.ps@bangkok.go.th, saraban@ba  สำนักปลัดกรุงเทพมหานคร                    เลขที่ 173 ศาลาว่าการกรุงเทพมหานคร (เสาช  กรุงเทพมหานคร                  0-2221-2141-69                                                                                                                                                                
2      saraban.csc@bangkok.go.th                 สำนักงานคณะกรรมการข้าราชการกรุงเทพมหานคร  ตั้งอยู่ที่ 173 ศาลาว่าการกรุงเทพมหานคร   กรุงเทพมหานคร                  0 2224 3020, 0 2221 2141-69                                                                                                                                                   
3      saraban.fd@bangkok.go.th                  สำนักการคลัง                              ศาลาว่าการกรุงเทพมหานคร 1 (เสาชิงช้า) เล  กรุงเทพมหานคร                  02-221-2141-69, 0 2226 6217                                                                                                                                                   
```

### Sheet: `Sheet1`
- max_row (reported): **1**, real columns with data: **0/1**
- header detected at row **1**
- data rows: **0** total, **0** non-empty

**Headers:**


**Column fill rate** (non-empty / total):
```
_(no rows)_
```

**Sample (first 3 data rows, truncated):**
```
_(no rows)_
```

## File: `ที่ตั้ง 36 โครงการของ AssetWise.xlsx`

### Sheet: `Sheet1`
- max_row (reported): **52**, real columns with data: **8/8**
- header detected at row **4**
- data rows: **48** total, **42** non-empty

**Headers:**
`1` | `เคฟ เอ็มบริโอ รังสิต` | `1` | `RTM` | `https://share.google/lADAmvvxK70c9oCgT` | `รังสิต` | `ตั้งอยู่บนถนนเลียบคลองหกฝั่งตะวันออก ตำบลคลองหก อำเภอคลองหลวง จังหวัดปทุมธานี 12120` | `14.041302094472156, 100.7338583`

**Column fill rate** (non-empty / total):
```
column                                    filled  null%  
---------------------------------------------------------
1                                         35      16.7   
เคฟ เอ็มบริโอ รังสิต                      42      0.0    
1                                         35      16.7   
RTM                                       35      16.7   
https://share.google/lADAmvvxK70c9oCgT    35      16.7   
รังสิต                                    35      16.7   
ตั้งอยู่บนถนนเลียบคลองหกฝั่งตะวันออก ตำบลคลองหก อำเภอคลองหลวง จังหวัดปทุมธานี 1212035      16.7   
14.041302094472156, 100.7338583           35      16.7   
```

**Sample (first 3 data rows, truncated):**
```
1  เคฟ เอ็มบริโอ รังสิต  1  RTM       https://share.google/lADAmvvxK70c9oCgT  รังสิต   ตั้งอยู่บนถนนเลียบคลองหกฝั่งตะวันออก ตำบลคลองหก อำเภอคลองหลวง จังหวัดปทุมธานี 1212014.041302094472156, 100.7338583         
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
2  แอทโมซ คาแนล รังสิต   1  RTM       https://share.google/8EQPj0rEMr4shV7OU  รังสิิต  ตั้งอยู่ที่เลขที่ 117 ถนนรังสิต-ปทุมธานี  13.984779678803662, 100.60041386931279  
3  โมดิซ อาวองการ์ด      1  RTM       https://share.google/MYz4oQpFdnfiqWla6  รังสิต   ตั้งอยู่บนถนนคลองหลวง ตำบลคลองหนึ่ง อำเภ  14.063845790597643, 100.60825567116409  
4  เควาลอน               1  Pre-sale  https://share.google/XKdwVTOSgYCUKW2vT  รังสิต   ตั้งอยู่บนถนนพหลโยธิน ตำบลคลองหนึ่ง อำเภ  14.041796627891296, 100.6148877269846   
```
