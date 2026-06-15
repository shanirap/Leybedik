Leybedik Local — התקנה על מחשב Windows יחיד
=============================================

דרישות:
- Windows 10/11
- .NET 8 Runtime (https://dotnet.microsoft.com/download/dotnet/8.0)

התקנה:
1. חלצו את LeybedikLocal-win-x64.zip לתיקייה זמנית.
2. הריצו 01-Install-Local.cmd (מעתיק ל-C:\LeybedikLocal\App).
3. בפעם הראשונה נוצר appsettings.Local.json מהדוגמה — החליפו את מפתח ה-JWT.
4. הריצו 02-Start-Local.cmd.

שימוש:
- כתובת: http://localhost:5000
- משתמש ראשוני: admin@leybedik.local
- סיסמה ראשונית: ChangeMe123!
- מסד נתונים: C:\LeybedikLocal\Data\leybedik.db

הערות:
- הרשמה ציבורית כבויה (Registration.Enabled=false).
- ייבוא סריקה כבוי כברירת מחדל.
- לבניית חבילה חדשה מהמקור: deploy\build-production.ps1
