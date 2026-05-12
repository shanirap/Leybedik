using System.Text.Encodings.Web;
using System.Text.Json;
using Leybedik.Api.Dtos.Imports;
using Leybedik.Api.Services.Ai;
using Leybedik.Api.Services.Images;
using Microsoft.Extensions.Logging;

namespace Leybedik.Api.Services.Imports;

public class AiScanImportService : IScanImportService
{
  private const string PromptFallbackLyricsText = "לא זוהה טקסט ברור. ניתן לערוך כאן ידנית.";
  private const int MinRecognizedTextLength = 4;

  private static readonly JsonSerializerOptions DeserializeOptions = new()
  {
    PropertyNameCaseInsensitive = true,
    ReadCommentHandling = JsonCommentHandling.Skip,
    AllowTrailingCommas = true,
  };

  private static readonly JsonSerializerOptions SerializeOptions = new()
  {
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false,
    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
  };

  private readonly IAiVisionClient _visionClient;
  private readonly ScanImportPromptBuilder _promptBuilder;
  private readonly ScanImportJsonExtractor _jsonExtractor;
  private readonly ScanImportContentNormalizer _normalizer;
  private readonly ScanImportContentValidator _validator;
  private readonly IImagePreprocessor _imagePreprocessor;
  private readonly ILogger<AiScanImportService> _logger;

  public AiScanImportService(
    IAiVisionClient visionClient,
    ScanImportPromptBuilder promptBuilder,
    ScanImportJsonExtractor jsonExtractor,
    ScanImportContentNormalizer normalizer,
    ScanImportContentValidator validator,
    IImagePreprocessor imagePreprocessor,
    ILogger<AiScanImportService> logger)
  {
    _visionClient = visionClient;
    _promptBuilder = promptBuilder;
    _jsonExtractor = jsonExtractor;
    _normalizer = normalizer;
    _validator = validator;
    _imagePreprocessor = imagePreprocessor;
    _logger = logger;
  }

  public async Task<ScanImportResponse> ImportAsync(
    IFormFile file,
    CancellationToken cancellationToken = default)
  {
    ArgumentNullException.ThrowIfNull(file);

    await using var ms = new MemoryStream();
    await file.CopyToAsync(ms, cancellationToken).ConfigureAwait(false);
    var bytes = ms.ToArray();

    if (bytes.Length == 0)
    {
      throw new InvalidOperationException("קובץ ריק.");
    }

    var contentType = file.ContentType?.Trim();
    if (string.IsNullOrEmpty(contentType))
    {
      contentType = "application/octet-stream";
    }

    _logger.LogInformation(
      "Starting scan transcription. ContentType={ContentType}, Bytes={BytesLength}",
      contentType,
      bytes.Length);

    var transcriptionPrompt = _promptBuilder.BuildTranscriptionPrompt();
    var processed = await _imagePreprocessor
      .PreprocessAsync(bytes, contentType, cancellationToken)
      .ConfigureAwait(false);

    string transcriptionRawResponse;
    try
    {
      transcriptionRawResponse = await _visionClient
        .AnalyzeScanAsync(
          processed.Bytes,
          processed.ContentType,
          transcriptionPrompt,
          cancellationToken)
        .ConfigureAwait(false);
    }
    catch (ScanImportServiceUnavailableException)
    {
      throw;
    }
    catch (InvalidOperationException)
    {
      throw;
    }
    catch (Exception ex)
    {
      throw new InvalidOperationException(
        "זיהוי AI נכשל. בדקי מפתח API, רשת והגדרות מודל.", ex);
    }
    _logger.LogInformation(
      "Transcription AI response received. Length={Length}",
      transcriptionRawResponse.Length);

    string transcriptionJson;
    try
    {
      transcriptionJson = _jsonExtractor.ExtractJson(transcriptionRawResponse);
      _logger.LogInformation(
        "Transcription JSON extracted. Length={Length}, Snippet={Snippet}",
        transcriptionJson.Length,
        ToSafeSnippet(transcriptionJson));
    }
    catch (InvalidOperationException ex)
    {
      _logger.LogWarning(
        ex,
        "Transcription JSON extraction failed. Snippet={Snippet}",
        ToSafeSnippet(transcriptionRawResponse));
      return BuildFallbackResponse(Array.Empty<string>());
    }

    ScanTranscriptionResult? transcriptionResult;
    try
    {
      transcriptionResult = JsonSerializer.Deserialize<ScanTranscriptionResult>(
        transcriptionJson,
        DeserializeOptions);
    }
    catch (JsonException ex)
    {
      _logger.LogWarning(
        ex,
        "Transcription JSON parsing failed. Snippet={Snippet}",
        ToSafeSnippet(transcriptionJson));
      return BuildFallbackResponse(Array.Empty<string>());
    }

    var transcriptionWarnings = transcriptionResult?.Warnings ?? new List<string>();
    _logger.LogInformation(
      "Transcription parsed. IsReadable={IsReadable}, RecognizedTextLength={RecognizedTextLength}, WarningsCount={WarningsCount}",
      transcriptionResult?.IsReadable ?? false,
      transcriptionResult?.RecognizedText?.Length ?? 0,
      transcriptionWarnings.Count);
    if (!IsUsableTranscription(transcriptionResult))
    {
      _logger.LogWarning("Transcription not readable. Returning fallback document.");
      return BuildFallbackResponse(transcriptionWarnings);
    }

    var recognizedText = transcriptionResult!.RecognizedText.Trim();
    _logger.LogInformation(
      "Starting document JSON generation from recognized text. RecognizedTextLength={RecognizedTextLength}",
      recognizedText.Length);
    var documentPrompt = _promptBuilder.BuildDocumentJsonPrompt(recognizedText);

    string documentRawResponse;
    try
    {
      documentRawResponse = await _visionClient
        .AnalyzeTextAsync(documentPrompt, cancellationToken)
        .ConfigureAwait(false);
    }
    catch (ScanImportServiceUnavailableException)
    {
      throw;
    }
    catch (Exception ex)
    {
      _logger.LogWarning(
        ex,
        "Document JSON generation failed. Returning basic text document. RecognizedTextLength={RecognizedTextLength}",
        recognizedText.Length);
      return BuildBasicRecognizedTextResponse(recognizedText, transcriptionWarnings);
    }
    _logger.LogInformation(
      "Document AI response received. Length={Length}",
      documentRawResponse.Length);

    string json;
    try
    {
      json = _jsonExtractor.ExtractJson(documentRawResponse);
      _logger.LogInformation(
        "Document JSON extracted. Length={Length}, Snippet={Snippet}",
        json.Length,
        ToSafeSnippet(json));
    }
    catch (InvalidOperationException ex)
    {
      _logger.LogWarning(
        ex,
        "Document JSON extraction failed. Returning basic text document. Snippet={Snippet}",
        ToSafeSnippet(documentRawResponse));
      return BuildBasicRecognizedTextResponse(recognizedText, transcriptionWarnings);
    }

    ScanImportContent? parsed;
    try
    {
      parsed = JsonSerializer.Deserialize<ScanImportContent>(json, DeserializeOptions);
    }
    catch (JsonException ex)
    {
      _logger.LogWarning(
        ex,
        "Document JSON parsing failed. Returning basic text document. Snippet={Snippet}",
        ToSafeSnippet(json));
      return BuildBasicRecognizedTextResponse(recognizedText, transcriptionWarnings);
    }

    if (parsed is null)
    {
      _logger.LogWarning("Document JSON parsed as null. Returning basic text document.");
      return BuildBasicRecognizedTextResponse(recognizedText, transcriptionWarnings);
    }

    var normalized = _normalizer.Normalize(parsed);
    var validationMessages = _validator.Validate(normalized);
    _logger.LogInformation(
      "Imported document normalized. Blocks={BlocksCount}, ValidationWarnings={WarningsCount}",
      normalized.Blocks.Count,
      validationMessages.Count);

    var contentJsonString = JsonSerializer.Serialize(normalized, SerializeOptions);

    var warnings = new List<string>
    {
      "התוכן נוצר מזיהוי AI, מומלץ לבדוק ולערוך לפני הדפסה.",
    };
    if (HasOnlyFallbackBlock(normalized))
    {
      warnings.Add("הזיהוי מהתמונה לא היה מספיק ברור. מומלץ להעלות צילום חד, ישר ומואר יותר.");
    }
    warnings.AddRange(transcriptionWarnings);
    warnings.AddRange(validationMessages);

    return new ScanImportResponse
    {
      Title = "טיוטה מסריקה",
      ContentJson = contentJsonString,
      Warnings = warnings,
    };
  }

  private static bool HasOnlyFallbackBlock(ScanImportContent content)
  {
    if (content.Blocks.Count != 1)
    {
      return false;
    }

    var block = content.Blocks[0];
    if (!string.Equals(block.Type, "lyrics", StringComparison.OrdinalIgnoreCase))
    {
      return false;
    }

    var text = block.Text?.Trim() ?? string.Empty;
    return string.Equals(text, ScanImportSchema.FallbackLyricsText, StringComparison.Ordinal) ||
      string.Equals(text, PromptFallbackLyricsText, StringComparison.Ordinal);
  }

  private static bool IsUsableTranscription(ScanTranscriptionResult? result)
  {
    if (result is null || !result.IsReadable)
    {
      return false;
    }

    var text = result.RecognizedText?.Trim() ?? string.Empty;
    if (text.Length < MinRecognizedTextLength)
    {
      return false;
    }

    return !string.Equals(text, "[לא ברור]", StringComparison.Ordinal);
  }

  private static ScanImportResponse BuildFallbackResponse(IEnumerable<string> transcriptionWarnings)
  {
    var fallbackContent = new ScanImportContent
    {
      Version = ScanImportSchema.ExpectedVersion,
      Blocks =
      [
        new ScanImportBlock
        {
          Id = "block-1",
          Type = "lyrics",
          Text = PromptFallbackLyricsText,
          Elements = [],
        },
      ],
    };

    var warnings = new List<string>
    {
      "הזיהוי מהתמונה לא היה מספיק ברור. מומלץ להעלות צילום חד, ישר ומואר יותר.",
    };
    warnings.AddRange(transcriptionWarnings);

    return new ScanImportResponse
    {
      Title = "טיוטה מסריקה",
      ContentJson = JsonSerializer.Serialize(fallbackContent, SerializeOptions),
      Warnings = warnings,
    };
  }

  private static ScanImportResponse BuildBasicRecognizedTextResponse(
    string recognizedText,
    IEnumerable<string> transcriptionWarnings)
  {
    var content = new ScanImportContent
    {
      Version = ScanImportSchema.ExpectedVersion,
      Blocks =
      [
        new ScanImportBlock
        {
          Id = "block-1",
          Type = "lyrics",
          Text = recognizedText,
          Elements = [],
        },
      ],
    };

    var warnings = new List<string>
    {
      "התוכן נוצר מזיהוי AI, מומלץ לבדוק ולערוך לפני הדפסה.",
      "הטקסט זוהה, אבל לא הצלחנו לסדר אותו אוטומטית. ניתן לערוך ידנית.",
    };
    warnings.AddRange(transcriptionWarnings);

    return new ScanImportResponse
    {
      Title = "טיוטה מסריקה",
      ContentJson = JsonSerializer.Serialize(content, SerializeOptions),
      Warnings = warnings,
    };
  }

  private static string ToSafeSnippet(string? value, int maxLength = 300)
  {
    if (string.IsNullOrWhiteSpace(value))
    {
      return string.Empty;
    }

    var normalized = value.Replace("\r", " ").Replace("\n", " ").Trim();
    if (normalized.Length <= maxLength)
    {
      return normalized;
    }

    return normalized[..maxLength] + "…";
  }
}
