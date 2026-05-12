using System.Text.Json;

namespace Leybedik.Api.Services.Imports;

public class ScanImportJsonExtractor
{
  public string ExtractJson(string rawText)
  {
    ArgumentNullException.ThrowIfNull(rawText);
    var trimmed = rawText.Trim();

    if (trimmed.Length == 0)
    {
      throw new InvalidOperationException("המודל החזיר טקסט ריק — לא נמצא JSON.");
    }

    // 1. JSON נקי
    if (trimmed.StartsWith('{') && trimmed.EndsWith('}'))
    {
      if (TryValidateJson(trimmed))
      {
        return trimmed;
      }
    }

    // 2. ```json ... ```
    var fenceJson = ExtractFromMarkdownFence(trimmed);
    if (fenceJson is not null)
    {
      return fenceJson;
    }

    // 3. { ראשון } אחרון
    var first = trimmed.IndexOf('{');
    var last = trimmed.LastIndexOf('}');
    if (first >= 0 && last > first)
    {
      var slice = trimmed[first..(last + 1)];
      if (TryValidateJson(slice))
      {
        return slice;
      }
    }

    throw new InvalidOperationException(
      "לא ניתן לחלץ JSON תקין מתשובת המודל.");
  }

  private static string? ExtractFromMarkdownFence(string text)
  {
    const string openFence = "```json";
    var start = text.IndexOf(openFence, StringComparison.OrdinalIgnoreCase);
    if (start < 0)
    {
      return null;
    }

    start += openFence.Length;
    var endFence = text.IndexOf("```", start, StringComparison.Ordinal);
    if (endFence < 0)
    {
      return null;
    }

    var inner = text[start..endFence].Trim();
    if (inner.Length == 0)
    {
      return null;
    }

    if (TryValidateJson(inner))
    {
      return inner;
    }

    return null;
  }

  private static bool TryValidateJson(string json)
  {
    try
    {
      using var doc = JsonDocument.Parse(json);
      return doc.RootElement.ValueKind == JsonValueKind.Object;
    }
    catch (JsonException)
    {
      return false;
    }
  }
}
