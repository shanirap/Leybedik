using Leybedik.Api.Dtos.Imports;
using Leybedik.Api.Services.Ai;
using Leybedik.Api.Services.Images;
using Leybedik.Api.Services.Imports;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Leybedik.Api.Tests;

public class AiScanImportServiceTests
{
  private static AiScanImportService CreateService(FakeTwoStepVisionClient vision)
  {
    return new AiScanImportService(
      vision,
      new ScanImportPromptBuilder(),
      new ScanImportJsonExtractor(),
      new ScanImportContentNormalizer(),
      new ScanImportContentValidator(),
      new PassthroughImagePreprocessor(),
      NullLogger<AiScanImportService>.Instance);
  }

  private static FormFile SmallPngFormFile()
  {
    var ms = new MemoryStream([0x89, 0x50]);
    return new FormFile(ms, 0, 2, "file", "x.png")
    {
      Headers = new HeaderDictionary(),
      ContentType = "image/png",
    };
  }

  [Fact]
  public async Task ImportAsync_WhenTranscriptionNotReadable_ReturnsFallbackAndSkipsSecondStage()
  {
    var vision = new FakeTwoStepVisionClient
    {
      ScanResponse = """{"isReadable":false,"recognizedText":"","warnings":["כתב יד לא ברור"]}""",
      TextResponse = """{"version":1,"blocks":[{"id":"b1","type":"lyrics","text":"לא אמור להגיע לכאן","elements":[]}]}""",
    };
    var svc = CreateService(vision);
    var result = await svc.ImportAsync(SmallPngFormFile());

    Assert.Contains("לא זוהה טקסט ברור. ניתן לערוך כאן ידנית.", result.ContentJson, StringComparison.Ordinal);
    Assert.Contains("הזיהוי מהתמונה לא היה מספיק ברור", string.Join(" | ", result.Warnings), StringComparison.Ordinal);
    Assert.Contains("כתב יד לא ברור", result.Warnings);
    Assert.Equal(0, vision.TextAnalyzeCalls);
  }

  [Fact]
  public async Task ImportAsync_WhenTranscriptionReadable_UsesSecondStageAndReturnsContentJson()
  {
    var vision = new FakeTwoStepVisionClient
    {
      ScanResponse = """{"isReadable":true,"recognizedText":"שלום עולם","warnings":["תמלול חלקי"]}""",
      TextResponse =
        """{"version":1,"blocks":[{"id":"b1","type":"lyrics","text":"שלום עולם","elements":[]}]}""",
    };
    var svc = CreateService(vision);
    var result = await svc.ImportAsync(SmallPngFormFile());

    Assert.Contains("שלום עולם", result.ContentJson, StringComparison.Ordinal);
    Assert.Contains("התוכן נוצר מזיהוי AI", result.Warnings[0], StringComparison.Ordinal);
    Assert.Contains("תמלול חלקי", result.Warnings);
    Assert.Equal(1, vision.TextAnalyzeCalls);
  }

  [Fact]
  public async Task ImportAsync_WhenStageTwoReturnsInvalidJson_ReturnsBasicTextDocument()
  {
    var vision = new FakeTwoStepVisionClient
    {
      ScanResponse = """{"isReadable":true,"recognizedText":"טקסט חלקי ברור","warnings":[]}""",
      TextResponse = """not valid json""",
    };
    var svc = CreateService(vision);
    var result = await svc.ImportAsync(SmallPngFormFile());

    Assert.Contains("טקסט חלקי ברור", result.ContentJson, StringComparison.Ordinal);
    Assert.Contains(
      "הטקסט זוהה, אבל לא הצלחנו לסדר אותו אוטומטית. ניתן לערוך ידנית.",
      result.Warnings);
    Assert.Equal(1, vision.TextAnalyzeCalls);
  }

  [Fact]
  public async Task ImportAsync_WhenStageOneReturnsInvalidJson_ReturnsFallbackWithoutThrowing()
  {
    var vision = new FakeTwoStepVisionClient
    {
      ScanResponse = """not valid json""",
    };
    var svc = CreateService(vision);

    var result = await svc.ImportAsync(SmallPngFormFile());

    Assert.Contains("לא זוהה טקסט ברור. ניתן לערוך כאן ידנית.", result.ContentJson, StringComparison.Ordinal);
    Assert.Equal(0, vision.TextAnalyzeCalls);
  }

  [Fact]
  public async Task ImportAsync_WhenTranscriptionUnclearPlaceholder_ReturnsFallback()
  {
    var vision = new FakeTwoStepVisionClient
    {
      ScanResponse = """{"isReadable":true,"recognizedText":"[לא ברור]","warnings":[]}""",
      TextResponse = """{"version":1,"blocks":[{"id":"b1","type":"lyrics","text":"x","elements":[]}]}""",
    };
    var svc = CreateService(vision);
    var result = await svc.ImportAsync(SmallPngFormFile());

    Assert.Contains("לא זוהה טקסט ברור. ניתן לערוך כאן ידנית.", result.ContentJson, StringComparison.Ordinal);
    Assert.Equal(0, vision.TextAnalyzeCalls);
  }

  [Fact]
  public async Task ImportAsync_VisionThrows_PropagatesClearFailure()
  {
    var vision = new FakeTwoStepVisionClient { ThrowOnScan = true };
    var svc = CreateService(vision);

    var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
      svc.ImportAsync(SmallPngFormFile()));

    Assert.Contains("זיהוי AI", ex.Message, StringComparison.Ordinal);
  }

  private sealed class FakeTwoStepVisionClient : IAiVisionClient
  {
    public string ScanResponse { get; set; } =
      """{"isReadable":true,"recognizedText":"ברירת מחדל","warnings":[]}""";
    public string TextResponse { get; set; } =
      """{"version":1,"blocks":[{"id":"b1","type":"lyrics","text":"ברירת מחדל","elements":[]}]}""";
    public bool ThrowOnScan { get; set; }
    public int TextAnalyzeCalls { get; private set; }

    public Task<string> AnalyzeScanAsync(
      byte[] fileBytes,
      string contentType,
      string prompt,
      CancellationToken cancellationToken = default)
    {
      if (ThrowOnScan)
      {
        throw new HttpRequestException("network");
      }

      return Task.FromResult(ScanResponse);
    }

    public Task<string> AnalyzeTextAsync(
      string prompt,
      CancellationToken cancellationToken = default)
    {
      TextAnalyzeCalls++;
      return Task.FromResult(TextResponse);
    }
  }

  private sealed class PassthroughImagePreprocessor : IImagePreprocessor
  {
    public Task<ProcessedImage> PreprocessAsync(
      byte[] bytes,
      string contentType,
      CancellationToken cancellationToken = default) =>
      Task.FromResult(new ProcessedImage(bytes, contentType));
  }
}
