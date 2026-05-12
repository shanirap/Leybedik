using System.Net;
using System.Text;
using Leybedik.Api.Options;
using Leybedik.Api.Services.Ai;
using Xunit;

namespace Leybedik.Api.Tests;

public class GeminiVisionClientTests
{
  [Fact]
  public async Task AnalyzeTextAsync_SendsApiKeyInHeaderAndNotInQueryString()
  {
    var handler = new RecordingHandler();
    var httpClient = new HttpClient(handler);
    var options = Microsoft.Extensions.Options.Options.Create(new AiScanImportOptions
    {
      ApiKey = "test-secret-key",
      Model = "gemini-test",
      Endpoint = "https://example.test",
    });
    var client = new GeminiVisionClient(httpClient, options);

    var result = await client.AnalyzeTextAsync("hello");

    Assert.Equal("{\"ok\":true}", result);
    Assert.NotNull(handler.LastRequest);
    Assert.Equal("test-secret-key", handler.LastRequest!.Headers.GetValues("x-goog-api-key").Single());
    Assert.DoesNotContain("key=", handler.LastRequest.RequestUri!.Query, StringComparison.OrdinalIgnoreCase);
  }

  private sealed class RecordingHandler : HttpMessageHandler
  {
    public HttpRequestMessage? LastRequest { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(
      HttpRequestMessage request,
      CancellationToken cancellationToken)
    {
      LastRequest = request;
      var responseJson =
        """{"candidates":[{"content":{"parts":[{"text":"{\"ok\":true}"}]}}]}""";
      return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
      {
        Content = new StringContent(responseJson, Encoding.UTF8, "application/json"),
      });
    }
  }
}
