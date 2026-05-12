# Leybedik Studio — תוכנית בדיקות (ידנית + אוטומטית)

בדיקות אוטומטיות מריצות: `npm test` (Frontend), `dotnet test` (Backend).  
רשימה זו מיועדת לבדיקה ידנית לפני/אחרי שינויים — סמני `[x]` כשבוצע.

---

## Frontend

### אימות וניווט
- [ ] **Login** — התחברות עם משתמש קיים; מקבלים token ומגיעים למסך מסמכים
- [ ] **Register** — הרשמה; אין כפילות אימייל; אחרי הצלחה מחוברים או ניתן להתחבר
- [ ] **Logout** — ניקוי session/local; חזרה למסך התחברות; בקשות מוגנות נכשלות בלי token
- [ ] **פתיחת מסך מסמכים** — רשימה נטענת; אין קריסה

### מסמכים
- [ ] **יצירת מסמך חדש** — נוצר ב-DB; מופיע ברשימה; נפתח לעריכה
- [ ] **פתיחת מסמך קיים** — תוכן ו-title נטענים מהשרת
- [ ] **שמירה ידנית** — כפתור שמור; סטטוס "נשמר"; רענון מציג שינוי
- [ ] **שמירה אוטומטית** — לאחר עריכה (והמתנה של כמה שניות) השמירה נקראת ללא קליק
- [ ] **שינוי שם** — prompt / זרימת שינוי שם; נשמר ומוצג ברשימה
- [ ] **שמור כעותק** — מסמך חדש עם תוכן זהה; המקורי לא נדרס
- [ ] **מחיקה** — מסמך נעלם מהרשימה (soft delete בשרת)
- [ ] **חיפוש מסמכים** — סינון לפי טקסט (אם קיים בשדה החיפוש)
- [ ] **מיון מסמכים** — לפי תאריך / כותרת כפי שהוגדר בממשק

### מצבי שגיאה ורשת
- [ ] **מצב loading** — בעת טעינה מוצג משוב (ספינר / טקסט); אין קליק כפול הרסני
- [ ] **מצב error** — כשל API מוצג למשתמש (לא שקט)
- [ ] **שרת כבוי** — הודעת שגיאה הגיונית; האפליקציה לא קורסת
- [ ] **רענון דפדפן וטעינה מחדש מהשרת** — אחרי שמירה, F5 — הנתונים מהשרת תואמים

---

## Editor (Leybedik Studio)

- [ ] **כתיבת טקסט** בבלוק מילים / textarea
- [ ] **הוספת בלוק מילים**
- [ ] **הוספת אקורד** (קליק על chord-lane)
- [ ] **שינוי אקורד מתוך select**
- [ ] **הזזת אקורד עם חיצים** (כשה-select לא בפוקוס הכללי)
- [ ] **הזזת אקורד אחרי שמירה/טעינה** — מיקום וערך נשמרים
- [ ] **הוספת טאבים** (בלוק טאבים + תווים צפים)
- [ ] **מחיקת הספרה 0 בתוך input טאב** — התיבה נשארת; לא נמחק כל הבלוק
- [ ] **הוספת מסגרת אישית** (special-box)
- [ ] **עמודי A4** — גודל דף תקין על המסך
- [ ] **מעבר לעמוד הבא** — תוכן ארוך מתפצל לעמוד שני (pagination)
- [ ] **הדפסה** — תצוגה מקדימה; sidebar מוסתר; מספר דפי A4
- [ ] **שמירה וטעינה של contentJson** — בלוקים, אקורדים וטאבים חוזרים אחרי refresh

---

## Backend (API)

### Auth & JWT
- [ ] **Register** — 200 + token; 409 על אימייל כפול
- [ ] **Login** — 200 + token נכון; 401 על סיסמה שגויה
- [ ] **JWT token** — נשלח ב-Authorization; גישה ל-`/api/documents` מותרת עם token תקף

### Documents
- [ ] **GET documents** — רק מסמכים של המשתמש המחובר
- [ ] **GET document by id** — תוכן מלא כששייך למשתמש
- [ ] **POST document** — נוצר עם OwnerUserId נכון
- [ ] **PUT document** — עדכון title + contentJson
- [ ] **DELETE** — soft delete (`IsDeleted=true`); לא מופיע ברשימה רגילה
- [ ] **משתמש לא יכול לגשת למסמך של משתמש אחר** — GET/PUT/DELETE מחזירים 404 או לא מחזירים נתון
- [ ] **404 למסמך שאינו שייך למשתמש** (או לא קיים)
- [ ] **לא מחזירים PasswordHash** ב-DTO של Auth או Documents

### Imports — סריקה (Mock)

- [ ] **Backend service layer for scan import** — `IScanImportService` + `MockScanImportService` / `AiScanImportService` (בחירה לפי קונפיג)
- [ ] **`appsettings.Development.json`** — `ScanImport:Provider` מוגדר ל־**Mock** (ברירת המחדל לפיתוח)
- [ ] **`appsettings.json`** — `ScanImport:Provider` לפחות Mock כברירת מסלול בטוח
- [ ] **נרמול + ולידציה ל־contentJson (ייבוא סריקה)** — `ScanImportContentNormalizer` / `ScanImportContentValidator`; מודלים ב־`ScanImportContentModels`
- [ ] **קונפיגורציה שגויה** — ערך Provider לא Mock/AI גורם ל־startup failure עם הודעה ברורה
- [ ] **Gemini / סריקת AI** — `AiScanImport:ApiKey` ב-User Secrets בלבד; `ScanImport:Provider` = `AI` לבדיקה; חזרה ל־`Mock` לפיתוח ללא עלות API
- [ ] **TODO: בדיקות אוטומטיות כש־Provider = AI** — smoke / integration אחרי מימוש
- [ ] **POST `/api/imports/scan`** — עם Bearer תקף מחזיר `title`, `contentJson` (מחרוזת), `warnings`
- [ ] **העלאת PNG** — טיוטה נפתחת בעורך עם בלוקים דמה
- [ ] **העלאת JPG / JPEG**
- [ ] **העלאת PDF**
- [ ] **קובץ לא נתמך** — הודעת BadRequest ברורה
- [ ] **קובץ ריק / בלי קובץ** — BadRequest
- [ ] **פתיחת טיוטה בעורך** — עריכה על תוכן המוק
- [ ] **שמירת הטיוטה** — כמו מסמך חדש (`temp-` → POST documents)
- [ ] **רענון וטעינה מהשרת** — אחרי שמירה
- [ ] **אזהרות זיהוי** — מוצגות בדיאלוג לפני ״פתיחה בעורך״

---

## בדיקות אוטומטיות — מה כיסוי קיים

| אזור | כלי | קבצים |
|------|-----|--------|
| Frontend utils | Vitest (`vitest.config.ts` + `vite.config.ts`) | `src/test/setup.ts`, `authStorage.test.ts`, `editorDocumentSerializer.test.ts`, `documentsApi.test.ts`, `importsApi.test.ts` |
| Backend | xUnit + EF InMemory | `JwtServiceTests.cs`, `LeybedikDbContextTests.cs`, `MockScanImportServiceTests.cs`, `ScanImportContentNormalizerTests.cs`, `ScanImportContentValidatorTests.cs`, `ScanImportJsonExtractorTests.cs`, `ScanImportPromptBuilderTests.cs`, `AiScanImportServiceTests.cs` |

---

## TODO — ייבוא סריקה (אוטומטי עתידי)

- [ ] בדיקת Controller ל־`ImportsController` עם multipart / Integration
- [ ] טסטים/Integration עם קריאה חיה ל-Gemini (אופציונלי; לא ברירת המחדל ב-CI)
- [ ] תמיכה ב־`AiScanImport:Provider` נוסף (למשל OpenAI) עם מימוש `IAiVisionClient` חדש

---

## TODO — Integration / E2E (עתידי)

כסיסמה רציפות JWT ו-test auth ב-WebApplicationFactory דורשים הקמה נפרדת — לא חובה בשלב זה.

- [ ] **Integration**: WebApplicationFactory + `HttpClient` — Login → CRUD מסמך → Soft delete
- [ ] **Integration**: וידוא route `/api/documents` עם `[Authorize]`
- [ ] **E2E** (Playwright וכו'): זרימת משתמש מלאה מהדפדפן

סמן כאן כשמתחילים להוסיף:

- תאריך: _______________
- אחראי: _______________
