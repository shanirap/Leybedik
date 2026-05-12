using System.Text.Json;
using Leybedik.Api.Dtos.Imports;
using Leybedik.Api.Services.Imports;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Leybedik.Api.Tests;

public class MockScanImportServiceTests
{
  private static MockScanImportService CreateService()
  {
    return new MockScanImportService(
      new ScanImportContentNormalizer(),
      new ScanImportContentValidator());
  }

  private static readonly JsonSerializerOptions JsonOpts = new()
  {
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
  };

  [Fact]
  public async Task ImportAsync_ReturnsNonEmptyTitleContentJsonWarningsAndValidJson()
  {
    await using var ms = new MemoryStream([1]);
    var formFile = new FormFile(ms, 0, 1, "file", "x.png")
    {
      Headers = new HeaderDictionary(),
      ContentType = "image/png",
    };

    var svc = CreateService();
    var result = await svc.ImportAsync(formFile);

    Assert.False(string.IsNullOrWhiteSpace(result.Title));
    Assert.False(string.IsNullOrWhiteSpace(result.ContentJson));
    Assert.NotEmpty(result.Warnings);

    using var doc = JsonDocument.Parse(result.ContentJson);
    Assert.Equal(JsonValueKind.Object, doc.RootElement.ValueKind);
    Assert.True(doc.RootElement.TryGetProperty("blocks", out var blocks));
    Assert.Equal(JsonValueKind.Array, blocks.ValueKind);
  }

  [Fact]
  public async Task ImportAsync_ContentJson_Deserializes_AndPassesValidation()
  {
    await using var ms = new MemoryStream([1]);
    var formFile = new FormFile(ms, 0, 1, "file", "x.png")
    {
      Headers = new HeaderDictionary(),
      ContentType = "image/png",
    };

    var validator = new ScanImportContentValidator();
    var svc = CreateService();
    var result = await svc.ImportAsync(formFile);

    var parsed = JsonSerializer.Deserialize<ScanImportContent>(result.ContentJson, JsonOpts);
    Assert.NotNull(parsed);

    var messages = validator.Validate(parsed);
    Assert.Empty(messages);
  }
}
