using Leybedik.Api.Services.Images;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace Leybedik.Api.Tests;

public class ImagePreprocessorTests
{
  private readonly ImagePreprocessor _preprocessor = new();

  [Fact]
  public async Task PreprocessAsync_SmallJpeg_ReturnsJpegAndNonEmptyBytes()
  {
    var jpegBytes = await CreateJpegAsync(200, 200);

    var result = await _preprocessor.PreprocessAsync(jpegBytes, "image/jpeg");

    Assert.Equal("image/jpeg", result.ContentType);
    Assert.NotEmpty(result.Bytes);
  }

  [Fact]
  public async Task PreprocessAsync_Pdf_ReturnsOriginal()
  {
    var original = new byte[] { 1, 2, 3, 4, 5 };

    var result = await _preprocessor.PreprocessAsync(original, "application/pdf");

    Assert.Equal("application/pdf", result.ContentType);
    Assert.Equal(original, result.Bytes);
  }

  [Fact]
  public async Task PreprocessAsync_InvalidImageBytes_ReturnsOriginalAndDoesNotThrow()
  {
    var original = new byte[] { 10, 20, 30, 40 };

    var result = await _preprocessor.PreprocessAsync(original, "image/jpeg");

    Assert.Equal("image/jpeg", result.ContentType);
    Assert.Equal(original, result.Bytes);
  }

  [Fact]
  public async Task PreprocessAsync_LargeImage_DoesNotGrowSignificantly()
  {
    var largePng = await CreatePngAsync(3200, 2400);

    var result = await _preprocessor.PreprocessAsync(largePng, "image/png");

    Assert.Equal("image/jpeg", result.ContentType);
    Assert.NotEmpty(result.Bytes);
    Assert.True(result.Bytes.Length <= largePng.Length * 2);
  }

  private static async Task<byte[]> CreateJpegAsync(int width, int height)
  {
    using var image = new Image<Rgb24>(width, height, new Rgb24(240, 240, 240));
    await using var ms = new MemoryStream();
    await image.SaveAsJpegAsync(ms, new JpegEncoder { Quality = 90 });
    return ms.ToArray();
  }

  private static async Task<byte[]> CreatePngAsync(int width, int height)
  {
    using var image = new Image<Rgb24>(width, height, new Rgb24(240, 240, 240));
    await using var ms = new MemoryStream();
    await image.SaveAsPngAsync(ms);
    return ms.ToArray();
  }
}
