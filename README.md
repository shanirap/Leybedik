# Leybedik Studio

עורך מוזיקלי לשירים, אקורדים וטאבים — React (Vite) + ASP.NET Core API.

## פיתוח מקומי

### דרישות
- Node.js 20+
- .NET 8 SDK
- SQL Server (פיתוח) או SQLite (מצב Local)

### Frontend
```powershell
cd client
npm install
npm run dev
```

### Backend
```powershell
cd server\Leybedik.Api
dotnet run --launch-profile http
```

ברירת מחדל בפיתוח: `http://localhost:5299` (Swagger), ה-frontend בדרך כלל על `http://localhost:5173`.

### בדיקות
```powershell
cd client
npm run lint
npm test
npm run build

cd ..\server\Leybedik.Api.Tests
dotnet test
```

## פריסה מקומית (Windows — מחשב יחיד)

1. הריצו `deploy\build-production.ps1` — בונה client, מעתיק ל-`wwwroot`, מפרסם `win-x64`, ויוצר `deploy\LeybedikLocal-win-x64.zip`.
2. חלצו את ה-ZIP והריצו `01-Install-Local.cmd` ואז `02-Start-Local.cmd`.
3. פרטים מלאים: [`deploy/README-INSTALL.txt`](deploy/README-INSTALL.txt).

הגדרות לדוגמה (ללא סודות): [`server/Leybedik.Api/appsettings.Local.json.example`](server/Leybedik.Api/appsettings.Local.json.example).

## מבנה הפרויקט

| תיקייה | תוכן |
|--------|------|
| `client/` | React + TypeScript + Vitest |
| `server/Leybedik.Api/` | ASP.NET Core API |
| `server/Leybedik.Api.Tests/` | בדיקות xUnit |
| `deploy/` | סקריפטי build והתקנה מקומית |
| `TEST_PLAN.md` | רשימת בדיקות ידניות |

## CI

GitHub Actions (`.github/workflows/ci.yml`): lint + tests + build בצד לקוח, `dotnet test` בשרת — על push/PR ל-`main`/`master`.

## הערות חבילה

אל תכללו ב-ZIP לבדיקה/שיתוף: `node_modules`, `dist`, `.git`, ארטיפקטי publish ישנים. השתמשו ב-`build-production.ps1` לחבילה נקייה.
