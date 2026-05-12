namespace Leybedik.Api.Services.Images;

public interface IImagePreprocessor
{
  Task<ProcessedImage> PreprocessAsync(
    byte[] bytes,
    string contentType,
    CancellationToken cancellationToken = default);
}

public sealed record ProcessedImage(byte[] Bytes, string ContentType);
