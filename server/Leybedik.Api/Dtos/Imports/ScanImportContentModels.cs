namespace Leybedik.Api.Dtos.Imports;

/// <summary>
/// תיאור JSON תואם ל־EditorDocumentContent בפרונט (camelCase בסריאליזציה).
/// </summary>
public class ScanImportContent
{
  public int Version { get; set; } = 1;
  public List<ScanImportBlock> Blocks { get; set; } = new();
}

public class ScanImportBlock
{
  public string Id { get; set; } = string.Empty;
  public string Type { get; set; } = string.Empty;
  public string? Text { get; set; }
  /// <summary>בלוקים personal / explain — כותרת תיבה.</summary>
  public string? Title { get; set; }
  /// <summary>בלוק chordDiagram.</summary>
  public string? ChordName { get; set; }
  public List<ScanImportElement> Elements { get; set; } = new();
}

public class ScanImportElement
{
  public string Id { get; set; } = string.Empty;
  public string Type { get; set; } = string.Empty;
  public string? Value { get; set; }
  public double X { get; set; }
  public double Y { get; set; }
}

/// <summary>ערכים חוקיים כפי שמוגדרים ב־src/types/editorDocument.ts</summary>
public static class ScanImportSchema
{
  public const int ExpectedVersion = 1;

  public const double MinX = 0;
  public const double MaxX = 650;
  public const double MinY = 0;
  public const double MaxY = 500;

  public static readonly HashSet<string> ValidBlockTypes =
    new(StringComparer.OrdinalIgnoreCase)
    {
      "lyrics",
      "chords",
      "tabs",
      "personal",
      "explain",
      "chordDiagram",
    };

  public static readonly HashSet<string> ValidElementTypes =
    new(StringComparer.OrdinalIgnoreCase)
    {
      "chord",
      "tabNote",
      "volta",
      "repeatStart",
      "repeatEnd",
      "breath",
      "dynamic",
      "chordDot",
    };

  public const string FallbackLyricsText =
    "לא זוהה תוכן. ניתן לערוך כאן ידנית.";
}
