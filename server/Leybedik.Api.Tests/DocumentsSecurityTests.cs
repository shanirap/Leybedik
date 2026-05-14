using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace Leybedik.Api.Tests;

public class DocumentsSecurityTests : IClassFixture<TestAppFactory>
{
  private readonly HttpClient _client;

  public DocumentsSecurityTests(TestAppFactory factory)
  {
    _client = factory.CreateClient();
  }

  [Fact]
  public async Task CreateDocument_WithoutToken_ReturnsUnauthorized()
  {
    var response = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך ללא הרשאה",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task GetDocuments_WithoutToken_ReturnsUnauthorized()
  {
    var response = await _client.GetAsync("/api/documents");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task CreateDocument_WithOwnFolder_SavesFolderIdAndFolderName()
  {
    var token = await RegisterAndGetTokenAsync("doc-owner@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var folderResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "כינור"
    });

    Assert.Equal(HttpStatusCode.OK, folderResponse.StatusCode);

    var folder = await folderResponse.Content.ReadFromJsonAsync<FolderResponse>();

    Assert.NotNull(folder);

    var createDocumentResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך כינור",
      folderId = folder!.id,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createDocumentResponse.StatusCode);

    var document = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentResponse>();

    Assert.NotNull(document);
    Assert.True(document!.id > 0);
    Assert.Equal("מסמך כינור", document.title);
    Assert.Equal(folder.id, document.folderId);
    Assert.Equal("כינור", document.folderName);
  }

  [Fact]
  public async Task CreateDocument_WithoutFolder_SavesNullFolder()
  {
    var token = await RegisterAndGetTokenAsync("no-folder@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var createDocumentResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך ללא תיקייה",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createDocumentResponse.StatusCode);

    var document = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentResponse>();

    Assert.NotNull(document);
    Assert.True(document!.id > 0);
    Assert.Equal("מסמך ללא תיקייה", document.title);
    Assert.Null(document.folderId);
    Assert.Null(document.folderName);
  }

  [Fact]
  public async Task GetDocuments_ReturnsOnlyCurrentUserDocuments()
  {
    var userAToken = await RegisterAndGetTokenAsync("docs-user-a@test.local");
    var userBToken = await RegisterAndGetTokenAsync("docs-user-b@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userAToken);

    var userADocumentResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך של משתמש א",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, userADocumentResponse.StatusCode);

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userBToken);

    var userBDocumentResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך של משתמש ב",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, userBDocumentResponse.StatusCode);

    var listResponse = await _client.GetAsync("/api/documents");

    Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

    var documents = await listResponse.Content.ReadFromJsonAsync<List<DocumentListItemResponse>>();

    Assert.NotNull(documents);
    Assert.Single(documents!);
    Assert.Equal("מסמך של משתמש ב", documents![0].title);
  }

  [Fact]
  public async Task GetDocument_OtherUsersDocument_ReturnsNotFound()
  {
    var userAToken = await RegisterAndGetTokenAsync("read-user-a@test.local");
    var userBToken = await RegisterAndGetTokenAsync("read-user-b@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userAToken);

    var createResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך פרטי",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var document = await createResponse.Content.ReadFromJsonAsync<DocumentResponse>();
    Assert.NotNull(document);

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userBToken);

    var readResponse = await _client.GetAsync($"/api/documents/{document!.id}");

    Assert.Equal(HttpStatusCode.NotFound, readResponse.StatusCode);
  }

  [Fact]
  public async Task UpdateDocument_OtherUsersDocument_ReturnsNotFound()
  {
    var userAToken = await RegisterAndGetTokenAsync("update-user-a@test.local");
    var userBToken = await RegisterAndGetTokenAsync("update-user-b@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userAToken);

    var createResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך של משתמש א",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var document = await createResponse.Content.ReadFromJsonAsync<DocumentResponse>();
    Assert.NotNull(document);

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userBToken);

    var updateResponse = await _client.PutAsJsonAsync($"/api/documents/{document!.id}", new
    {
      title = "נסיון שינוי",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
  }

  [Fact]
  public async Task DeleteDocument_OtherUsersDocument_ReturnsNotFound()
  {
    var userAToken = await RegisterAndGetTokenAsync("delete-user-a@test.local");
    var userBToken = await RegisterAndGetTokenAsync("delete-user-b@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userAToken);

    var createResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך למחיקה",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var document = await createResponse.Content.ReadFromJsonAsync<DocumentResponse>();
    Assert.NotNull(document);

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userBToken);

    var deleteResponse = await _client.DeleteAsync($"/api/documents/{document!.id}");

    Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
  }

  [Fact]
  public async Task UpdateDocument_WithOtherUsersFolderId_ReturnsBadRequest()
  {
    var userAToken = await RegisterAndGetTokenAsync("folder-update-a@test.local");
    var userBToken = await RegisterAndGetTokenAsync("folder-update-b@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", userAToken);

    var createDocumentResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך של משתמש א",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createDocumentResponse.StatusCode);

    var document = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentResponse>();
    Assert.NotNull(document);

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

    var updateResponse = await _client.PutAsJsonAsync($"/api/documents/{document!.id}", new
    {
      title = "נסיון שיוך לתיקייה זרה",
      folderId = folder!.id,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
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

  private sealed class DocumentResponse
  {
    public int id { get; set; }
    public string title { get; set; } = string.Empty;
    public int? folderId { get; set; }
    public string? folderName { get; set; }
    public string contentJson { get; set; } = string.Empty;
    public DateTime createdAt { get; set; }
    public DateTime updatedAt { get; set; }
  }

  private sealed class DocumentListItemResponse
  {
    public int id { get; set; }
    public string title { get; set; } = string.Empty;
    public int? folderId { get; set; }
    public string? folderName { get; set; }
    public DateTime createdAt { get; set; }
    public DateTime updatedAt { get; set; }
  }
}
