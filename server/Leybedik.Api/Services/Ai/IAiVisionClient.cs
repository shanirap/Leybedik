namespace Leybedik.Api.Services.Ai;

public interface IAiVisionClient
{
  Task<string> AnalyzeScanAsync(
    byte[] fileBytes,
    string contentType,
    string prompt,
    CancellationToken cancellationToken = default);

  Task<string> AnalyzeTextAsync(
    string prompt,
    CancellationToken cancellationToken = default);
}
