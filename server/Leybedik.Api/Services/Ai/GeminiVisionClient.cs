using System.Net;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using Leybedik.Api.Options;
using Leybedik.Api.Services.Imports;
using Microsoft.Extensions.Options;

namespace Leybedik.Api.Services.Ai;

public class GeminiVisionClient : IAiVisionClient
{
  private const int MaxErrorBodyLen = 800;
  private const int MaxAttempts = 3;

  private readonly HttpClient _httpClient;
  private readonly AiScanImportOptions _options;

  public GeminiVisionClient(HttpClient httpClient, IOptions<AiScanImportOptions> options)
  {
    _httpClient = httpClient;
    _options = options.Value;
  }

  public async Task<string> AnalyzeScanAsync(
    byte[] fileBytes,
    string contentType,
    string prompt,
    CancellationToken cancellationToken = default)
  {
    ArgumentNullException.ThrowIfNull(fileBytes);
    if (fileBytes.Length == 0)
    {
      throw new InvalidOperationException("קובץ ריק — אין מה לשלוח ל-Gemini.");
    }

    EnsureConfigured();

    var mime = string.IsNullOrWhiteSpace(contentType)
      ? "application/octet-stream"
      : contentType.Trim();

    var b64 = Convert.ToBase64String(fileBytes);
    var body = BuildImageRequestBody(prompt, mime, b64);
    return await SendGenerateContentAsync(body, cancellationToken).ConfigureAwait(false);
  }

  public async Task<string> AnalyzeTextAsync(
    string prompt,
    CancellationToken cancellationToken = default)
  {
    if (string.IsNullOrWhiteSpace(prompt))
    {
      throw new InvalidOperationException("לא התקבל prompt לטקסט.");
    }

    EnsureConfigured();
    var body = BuildTextRequestBody(prompt);
    return await SendGenerateContentAsync(body, cancellationToken).ConfigureAwait(false);
  }

  private async Task<string> SendGenerateContentAsync(
    string body,
    CancellationToken cancellationToken)
  {
    var url = BuildGenerateContentUrl();
    for (var attempt = 1; attempt <= MaxAttempts; attempt++)
    {
      using var request = new HttpRequestMessage(HttpMethod.Post, url)
      {
        Content = new StringContent(body, Encoding.UTF8, MediaTypeNames.Application.Json),
      };
      request.Headers.Add("x-goog-api-key", _options.ApiKey);

      using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
      var responseText = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);

      if (response.IsSuccessStatusCode)
      {
        return ExtractModelText(responseText);
      }

      var statusCode = response.StatusCode;
      var snippet = responseText.Length <= MaxErrorBodyLen
        ? responseText
        : responseText[..MaxErrorBodyLen] + "…";

      // שגיאות אימות/הרשאה הן קבועות בדרך כלל, לכן לא מבצעים retry.
      if (statusCode == HttpStatusCode.BadRequest ||
          statusCode == HttpStatusCode.Unauthorized ||
          statusCode == HttpStatusCode.Forbidden)
      {
        throw new InvalidOperationException(
          $"קריאת Gemini נכשלה ללא retry: {(int)statusCode} {response.ReasonPhrase}. {snippet}");
      }

      var isRetryable =
        statusCode == HttpStatusCode.ServiceUnavailable ||
        statusCode == HttpStatusCode.TooManyRequests ||
        (int)statusCode >= 500;

      if (isRetryable && attempt < MaxAttempts)
      {
        await Task.Delay(TimeSpan.FromSeconds(attempt), cancellationToken).ConfigureAwait(false);
        continue;
      }

      if (statusCode == HttpStatusCode.ServiceUnavailable ||
          statusCode == HttpStatusCode.TooManyRequests)
      {
        throw new ScanImportServiceUnavailableException();
      }

      throw new InvalidOperationException(
        $"קריאת Gemini נכשלה: {(int)statusCode} {response.ReasonPhrase}. {snippet}");
    }

    throw new InvalidOperationException("קריאת Gemini נכשלה לאחר כל ניסיונות ה-retry.");
  }

  private string BuildGenerateContentUrl()
  {
    var endpoint = _options.Endpoint?.Trim().TrimEnd('/') ?? "";
    return $"{endpoint}/v1beta/models/{_options.Model}:generateContent";
  }

  private void EnsureConfigured()
  {
    if (string.IsNullOrWhiteSpace(_options.ApiKey))
    {
      throw new InvalidOperationException(
        "חסר מפתח API ל-Gemini. הגדירי AiScanImport:ApiKey ב-User Secrets או בסביבה.");
    }

    if (string.IsNullOrWhiteSpace(_options.Model))
    {
      throw new InvalidOperationException("חסר שם מודל (AiScanImport:Model).");
    }

    var endpoint = _options.Endpoint?.Trim().TrimEnd('/') ?? "";
    if (string.IsNullOrEmpty(endpoint))
    {
      throw new InvalidOperationException("חסר Endpoint (AiScanImport:Endpoint).");
    }
  }

  private static string BuildImageRequestBody(string prompt, string mimeType, string base64Data)
  {
    using var stream = new MemoryStream();
    using (var writer = new Utf8JsonWriter(stream))
    {
      writer.WriteStartObject();

      writer.WriteStartArray("contents");
      writer.WriteStartObject();
      writer.WriteString("role", "user");

      writer.WriteStartArray("parts");
      writer.WriteStartObject();
      writer.WriteString("text", prompt);
      writer.WriteEndObject();

      writer.WriteStartObject();
      writer.WriteStartObject("inline_data");
      writer.WriteString("mime_type", mimeType);
      writer.WriteString("data", base64Data);
      writer.WriteEndObject();
      writer.WriteEndObject();

      writer.WriteEndArray();
      writer.WriteEndObject();
      writer.WriteEndArray();

      writer.WriteStartObject("generationConfig");
      writer.WriteNumber("temperature", 0.1);
      writer.WriteString("responseMimeType", "application/json");
      writer.WriteEndObject();

      writer.WriteEndObject();
    }

    return Encoding.UTF8.GetString(stream.ToArray());
  }

  private static string BuildTextRequestBody(string prompt)
  {
    using var stream = new MemoryStream();
    using (var writer = new Utf8JsonWriter(stream))
    {
      writer.WriteStartObject();

      writer.WriteStartArray("contents");
      writer.WriteStartObject();
      writer.WriteString("role", "user");

      writer.WriteStartArray("parts");
      writer.WriteStartObject();
      writer.WriteString("text", prompt);
      writer.WriteEndObject();
      writer.WriteEndArray();

      writer.WriteEndObject();
      writer.WriteEndArray();

      writer.WriteStartObject("generationConfig");
      writer.WriteNumber("temperature", 0.1);
      writer.WriteString("responseMimeType", "application/json");
      writer.WriteEndObject();

      writer.WriteEndObject();
    }

    return Encoding.UTF8.GetString(stream.ToArray());
  }

  private static string ExtractModelText(string responseJson)
  {
    JsonDocument doc;
    try
    {
      doc = JsonDocument.Parse(responseJson);
    }
    catch (JsonException ex)
    {
      throw new InvalidOperationException("תגובת Gemini אינה JSON תקין.", ex);
    }

    using (doc)
    {
      var root = doc.RootElement;
      if (!root.TryGetProperty("candidates", out var candidates) ||
          candidates.ValueKind != JsonValueKind.Array ||
          candidates.GetArrayLength() == 0)
      {
        throw new InvalidOperationException(
          "תגובת Gemini ללא candidates — אין טקסט מהמודל.");
      }

      var first = candidates[0];
      if (!first.TryGetProperty("content", out var content))
      {
        throw new InvalidOperationException(
          "תגובת Gemini: חסר candidates[0].content.");
      }

      if (!content.TryGetProperty("parts", out var parts) ||
          parts.ValueKind != JsonValueKind.Array ||
          parts.GetArrayLength() == 0)
      {
        throw new InvalidOperationException(
          "תגובת Gemini: חסר content.parts עם טקסט.");
      }

      var part0 = parts[0];
      if (!part0.TryGetProperty("text", out var textEl))
      {
        throw new InvalidOperationException(
          "תגובת Gemini: חסר part.text.");
      }

      var text = textEl.GetString();
      if (string.IsNullOrWhiteSpace(text))
      {
        throw new InvalidOperationException("תגובת Gemini: טקסט המודל ריק.");
      }

      return text;
    }
  }
}
