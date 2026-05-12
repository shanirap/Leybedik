using System.Text.Encodings.Web;
using System.Text.Json;
using Leybedik.Api.Dtos.Imports;

namespace Leybedik.Api.Services.Imports;

/// <summary>
/// זיהוי סריקה דמה — בהמשך ניתן להחליף רישום DI למימוש עם AI/OCR.
/// </summary>
public class MockScanImportService : IScanImportService
{
  private static readonly JsonSerializerOptions JsonOptions = new()
  {
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false,
    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
  };

  private readonly ScanImportContentNormalizer _normalizer;
  private readonly ScanImportContentValidator _validator;

  public MockScanImportService(
    ScanImportContentNormalizer normalizer,
    ScanImportContentValidator validator)
  {
    _normalizer = normalizer;
    _validator = validator;
  }

  public Task<ScanImportResponse> ImportAsync(IFormFile file, CancellationToken cancellationToken = default)
  {
    cancellationToken.ThrowIfCancellationRequested();

    var lyricsBlockId = Guid.NewGuid().ToString();
    var tabsBlockId = Guid.NewGuid().ToString();

    var raw = new ScanImportContent
    {
      Version = ScanImportSchema.ExpectedVersion,
      Blocks =
      [
        new ScanImportBlock
        {
          Id = lyricsBlockId,
          Type = "lyrics",
          Text =
            "זהו טקסט לדוגמה שזוהה מהדף הסרוק.\nבשלב הבא נחבר זיהוי אמיתי.",
          Elements =
          [
            new ScanImportElement
            {
              Id = Guid.NewGuid().ToString(),
              Type = "chord",
              Value = "Am",
              X = 80,
              Y = 8,
            },
            new ScanImportElement
            {
              Id = Guid.NewGuid().ToString(),
              Type = "chord",
              Value = "G",
              X = 180,
              Y = 8,
            },
          ],
        },
        new ScanImportBlock
        {
          Id = tabsBlockId,
          Type = "tabs",
          Text = null,
          Elements =
          [
            new ScanImportElement
            {
              Id = Guid.NewGuid().ToString(),
              Type = "tabNote",
              Value = "0",
              X = 80,
              Y = 28,
            },
            new ScanImportElement
            {
              Id = Guid.NewGuid().ToString(),
              Type = "tabNote",
              Value = "2",
              X = 140,
              Y = 28,
            },
          ],
        },
      ],
    };

    var normalized = _normalizer.Normalize(raw);
    var validationMessages = _validator.Validate(normalized);

    var contentJsonString = JsonSerializer.Serialize(normalized, JsonOptions);

    var warnings = new List<string>
    {
      "זהו זיהוי דמה לצורך בדיקת הזרימה.",
      "בשלב הבא ניתן לחבר מנוע AI לזיהוי כתב יד.",
    };

    warnings.AddRange(validationMessages);

    var response = new ScanImportResponse
    {
      Title = "טיוטה מסריקה",
      ContentJson = contentJsonString,
      Warnings = warnings,
    };

    return Task.FromResult(response);
  }
}
