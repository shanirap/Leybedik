using Leybedik.Api.Services.Imports;
using Xunit;

namespace Leybedik.Api.Tests;

public class ScanImportJsonExtractorTests
{
  private readonly ScanImportJsonExtractor _extractor = new();

  [Fact]
  public void ExtractJson_CleanObject_ReturnsSame()
  {
    var json = """{"version":1,"blocks":[]}""";
    Assert.Equal(json, _extractor.ExtractJson(json));
  }

  [Fact]
  public void ExtractJson_MarkdownFence_ReturnsInner()
  {
    var inner = """{"version":1,"blocks":[]}""";
    var wrapped = $"בדיקה\n```json\n{inner}\n```\nסוף";
    Assert.Equal(inner, _extractor.ExtractJson(wrapped));
  }

  [Fact]
  public void ExtractJson_WithPrefixAndSuffix_ReturnsSlice()
  {
    var inner = """{"version":1,"blocks":[]}""";
    var raw = $"קודם\n{inner}\nאחרי";
    Assert.Equal(inner, _extractor.ExtractJson(raw));
  }

  [Fact]
  public void ExtractJson_NoJson_Throws()
  {
    Assert.Throws<InvalidOperationException>(() =>
      _extractor.ExtractJson("אין כאן אובייקט json"));
  }
}
