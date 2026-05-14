using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace Leybedik.Api.Tests;

public class FoldersBehaviorTests : IClassFixture<TestAppFactory>
{
  private readonly HttpClient _client;

  public FoldersBehaviorTests(TestAppFactory factory)
  {
    _client = factory.CreateClient();
  }

  [Fact]
  public async Task CreateFolder_DuplicateNameForSameUser_ReturnsConflict()
  {
    var token = await RegisterAndGetTokenAsync("duplicate-folder@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var firstResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "גיטרה"
    });

    Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

    var secondResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "גיטרה"
    });

    Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
  }

  [Fact]
  public async Task CreateFolder_SameNameForDifferentUsers_IsAllowed()
  {
    var userAToken = await RegisterAndGetTokenAsync("same-folder-a@test.local");
    var userBToken = await RegisterAndGetTokenAsync("same-folder-b@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userAToken);

    var firstResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "גיטרה"
    });

    Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userBToken);

    var secondResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "גיטרה"
    });

    Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
  }

  [Fact]
  public async Task RenameFolder_WithOwnerToken_UpdatesFolderName()
  {
    var token = await RegisterAndGetTokenAsync("rename-folder@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var createResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "שם ישן"
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var folder = await createResponse.Content.ReadFromJsonAsync<FolderResponse>();
    Assert.NotNull(folder);

    var updateResponse = await _client.PutAsJsonAsync($"/api/folders/{folder!.id}", new
    {
      name = "שם חדש"
    });

    Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

    var updated = await updateResponse.Content.ReadFromJsonAsync<FolderResponse>();

    Assert.NotNull(updated);
    Assert.Equal(folder.id, updated!.id);
    Assert.Equal("שם חדש", updated.name);
  }

  [Fact]
  public async Task RenameFolder_OtherUsersFolder_ReturnsNotFound()
  {
    var userAToken = await RegisterAndGetTokenAsync("rename-other-a@test.local");
    var userBToken = await RegisterAndGetTokenAsync("rename-other-b@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userAToken);

    var createResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "תיקייה פרטית"
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var folder = await createResponse.Content.ReadFromJsonAsync<FolderResponse>();
    Assert.NotNull(folder);

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userBToken);

    var updateResponse = await _client.PutAsJsonAsync($"/api/folders/{folder!.id}", new
    {
      name = "נסיון שינוי"
    });

    Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
  }

  [Fact]
  public async Task GetFolders_ReturnsCorrectDocumentsCount()
  {
    var token = await RegisterAndGetTokenAsync("folder-count@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var createFolderResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "כינור"
    });

    Assert.Equal(HttpStatusCode.OK, createFolderResponse.StatusCode);

    var folder = await createFolderResponse.Content.ReadFromJsonAsync<FolderResponse>();
    Assert.NotNull(folder);

    var firstDocResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך 1",
      folderId = folder!.id,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, firstDocResponse.StatusCode);

    var secondDocResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך 2",
      folderId = folder.id,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, secondDocResponse.StatusCode);

    var foldersResponse = await _client.GetAsync("/api/folders");

    Assert.Equal(HttpStatusCode.OK, foldersResponse.StatusCode);

    var folders = await foldersResponse.Content.ReadFromJsonAsync<List<FolderResponse>>();

    Assert.NotNull(folders);

    var returnedFolder = Assert.Single(folders!);

    Assert.Equal(folder.id, returnedFolder.id);
    Assert.Equal("כינור", returnedFolder.name);
    Assert.Equal(2, returnedFolder.documentsCount);
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
