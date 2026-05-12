namespace Leybedik.Api.Services.Imports;

/// <summary>
/// נזרק כששירות הוויז'ן (למשל Gemini) זמין לא זמין זמנית — ממופה ל־HTTP 503 ללא חשיפת פרטים טכניים.
/// </summary>
public sealed class ScanImportServiceUnavailableException : Exception
{
  public ScanImportServiceUnavailableException()
    : base("שירות הזיהוי עמוס כרגע. נסי שוב בעוד דקה.")
  {
  }

  public ScanImportServiceUnavailableException(string message)
    : base(message)
  {
  }
}
