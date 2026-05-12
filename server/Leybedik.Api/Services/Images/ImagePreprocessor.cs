using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace Leybedik.Api.Services.Images;

public sealed class ImagePreprocessor : IImagePreprocessor
{
  private const int MaxWidth = 1600;
  private const int MaxHeight = 1600;
  private const int JpegQuality = 85;

  public async Task<ProcessedImage> PreprocessAsync(
    byte[] bytes,
    string contentType,
    CancellationToken cancellationToken = default)
  {
    ArgumentNullException.ThrowIfNull(bytes);

    var normalizedContentType = string.IsNullOrWhiteSpace(contentType)
      ? "application/octet-stream"
      : contentType.Trim();

    if (bytes.Length == 0)
    {
      return new ProcessedImage(bytes, normalizedContentType);
    }

    if (string.Equals(normalizedContentType, "application/pdf", StringComparison.OrdinalIgnoreCase))
    {
      return new ProcessedImage(bytes, normalizedContentType);
    }

    var isSupportedImage =
      string.Equals(normalizedContentType, "image/jpeg", StringComparison.OrdinalIgnoreCase) ||
      string.Equals(normalizedContentType, "image/jpg", StringComparison.OrdinalIgnoreCase) ||
      string.Equals(normalizedContentType, "image/png", StringComparison.OrdinalIgnoreCase);

    if (!isSupportedImage)
    {
      return new ProcessedImage(bytes, normalizedContentType);
    }

    try
    {
      await using var input = new MemoryStream(bytes);
      using var image = await Image.LoadAsync(input, cancellationToken).ConfigureAwait(false);

      if (image.Width > MaxWidth || image.Height > MaxHeight)
      {
        var ratio = Math.Min((double)MaxWidth / image.Width, (double)MaxHeight / image.Height);
        var newWidth = Math.Max(1, (int)Math.Round(image.Width * ratio));
        var newHeight = Math.Max(1, (int)Math.Round(image.Height * ratio));
        image.Mutate(x => x.Resize(newWidth, newHeight));
      }

      await using var output = new MemoryStream();
      var encoder = new JpegEncoder { Quality = JpegQuality };
      await image.SaveAsJpegAsync(output, encoder, cancellationToken).ConfigureAwait(false);

      return new ProcessedImage(output.ToArray(), "image/jpeg");
    }
    catch
    {
      return new ProcessedImage(bytes, normalizedContentType);
    }
  }
}
