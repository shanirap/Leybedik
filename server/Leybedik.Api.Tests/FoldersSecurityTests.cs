using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace Leybedik.Api.Tests;

public class FoldersSecurityTests : IClassFixture<TestAppFactory>
{
  private readonly HttpClient _client;

  public FoldersSecurityTests(TestAppFactory factory)
  {
    _client = factory.CreateClient();
  }

  [Fact]
  public async Task GetFolders_WithoutToken_ReturnsUnauthorized()
  {
    var response = await _client.GetAsync("/api/folders");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task CreateFolder_WithoutToken_ReturnsUnauthorized()
  {
    var response = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "גיטרה"
    });

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task DeleteFolder_WithoutToken_ReturnsUnauthorized()
  {
    var response = await _client.DeleteAsync("/api/folders/1");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task CreateFolder_WithToken_CreatesFolder()
  {
    var token = await RegisterAndGetTokenAsync("a@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var response = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "גיטרה"
    });

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var folder = await response.Content.ReadFromJsonAsync<FolderResponse>();

    Assert.NotNull(folder);
    Assert.True(folder!.id > 0);
    Assert.Equal("גיטרה", folder.name);
    Assert.Equal(0, folder.documentsCount);
  }

  [Fact]
  public async Task CreateDocument_WithOtherUsersFolderId_ReturnsBadRequest()
  {
    var userAToken = await RegisterAndGetTokenAsync("user-a@test.local");
    var userBToken = await RegisterAndGetTokenAsync("user-b@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userBToken);

    var createFolderResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "תיקייה של משתמש ב"
    });

    Assert.Equal(HttpStatusCode.OK, createFolderResponse.StatusCode);

    var folder = await createFolderResponse.Content.ReadFromJsonAsync<FolderResponse>();
    Assert.NotNull(folder);

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userAToken);

    var createDocumentResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך לא תקין",
      folderId = folder!.id,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.BadRequest, createDocumentResponse.StatusCode);
  }

  private async Task<string> RegisterAndGetTokenAsync(string email)
  {
    var response = await _client.PostAsJsonAsync("/api/auth/register", new
    {
      email,
      displayName = email,
      password = "Test12345!"
    });

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();

    Assert.NotNull(auth);
    Assert.False(string.IsNullOrWhiteSpace(auth!.token));

    return auth.token;
  }

  private sealed class AuthResponse
  {
    public string token { get; set; } = string.Empty;
    public string email { get; set; } = string.Empty;
    public string displayName { get; set; } = string.Empty;
  }

  private sealed class FolderResponse
  {
    public int id { get; set; }
    public string name { get; set; } = string.Empty;
    public int documentsCount { get; set; }
  }
}
