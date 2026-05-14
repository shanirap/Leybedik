using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace Leybedik.Api.Tests;

public class DocumentsBehaviorTests : IClassFixture<TestAppFactory>
{
  private readonly HttpClient _client;

  public DocumentsBehaviorTests(TestAppFactory factory)
  {
    _client = factory.CreateClient();
  }

  [Fact]
  public async Task CreateAndGetDocument_PreservesContentJson()
  {
    var token = await RegisterAndGetTokenAsync("content-json@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    const string contentJson = """
    {
      "version": 1,
      "blocks": [],
      "pages": [
        {
          "id": "page-1",
          "width": 794,
          "height": 1123,
          "elements": [
            {
              "id": "text-1",
              "type": "textBox",
              "x": 100,
              "y": 120,
              "width": 300,
              "height": 80,
              "zIndex": 1,
              "data": {
                "role": "text",
                "text": "שלום עולם",
                "fontSize": 24,
                "fontFamily": "Arial",
                "color": "#111827",
                "bold": false,
                "italic": false,
                "underline": false,
                "textAlign": "right",
                "direction": "rtl"
              }
            }
          ]
        }
      ]
    }
    """;

    var createResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך עם תוכן",
      folderId = (int?)null,
      contentJson
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var created = await createResponse.Content.ReadFromJsonAsync<DocumentResponse>();
    Assert.NotNull(created);

    var getResponse = await _client.GetAsync($"/api/documents/{created!.id}");

    Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

    var loaded = await getResponse.Content.ReadFromJsonAsync<DocumentResponse>();

    Assert.NotNull(loaded);
    Assert.Equal(created.id, loaded!.id);
    Assert.Equal("מסמך עם תוכן", loaded.title);
    Assert.Contains("שלום עולם", loaded.contentJson);
    Assert.Contains("\"type\": \"textBox\"", loaded.contentJson);
  }

  [Fact]
  public async Task UpdateDocument_ChangesTitleContentAndFolder()
  {
    var token = await RegisterAndGetTokenAsync("update-document@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var folderResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "אורגן"
    });

    Assert.Equal(HttpStatusCode.OK, folderResponse.StatusCode);

    var folder = await folderResponse.Content.ReadFromJsonAsync<FolderResponse>();
    Assert.NotNull(folder);

    var createResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "שם ישן",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var created = await createResponse.Content.ReadFromJsonAsync<DocumentResponse>();
    Assert.NotNull(created);

    const string updatedJson = """
    {"version":1,"blocks":[],"pages":[{"id":"page-1","width":794,"height":1123,"elements":[]}]}
    """;

    var updateResponse = await _client.PutAsJsonAsync($"/api/documents/{created!.id}", new
    {
      title = "שם חדש",
      folderId = folder!.id,
      contentJson = updatedJson
    });

    Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

    var updated = await updateResponse.Content.ReadFromJsonAsync<DocumentResponse>();

    Assert.NotNull(updated);
    Assert.Equal(created.id, updated!.id);
    Assert.Equal("שם חדש", updated.title);
    Assert.Equal(folder.id, updated.folderId);
    Assert.Equal("אורגן", updated.folderName);
    Assert.Contains("\"page-1\"", updated.contentJson);
  }

  [Fact]
  public async Task DeleteDocument_RemovesDocumentFromListAndGetReturnsNotFound()
  {
    var token = await RegisterAndGetTokenAsync("delete-document@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var createResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך למחיקה",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var created = await createResponse.Content.ReadFromJsonAsync<DocumentResponse>();
    Assert.NotNull(created);

    var deleteResponse = await _client.DeleteAsync($"/api/documents/{created!.id}");

    Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

    var getResponse = await _client.GetAsync($"/api/documents/{created.id}");
    Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);

    var listResponse = await _client.GetAsync("/api/documents");
    Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

    var documents = await listResponse.Content.ReadFromJsonAsync<List<DocumentListItemResponse>>();

    Assert.NotNull(documents);
    Assert.Empty(documents!);
  }

  [Fact]
  public async Task UpdateDocument_ToNullFolder_RemovesFolder()
  {
    var token = await RegisterAndGetTokenAsync("remove-folder@test.local");

    _client.DefaultRequestHeaders.Authorization =
      new AuthenticationHeaderValue("Bearer", token);

    var folderResponse = await _client.PostAsJsonAsync("/api/folders", new
    {
      name = "גיטרה"
    });

    Assert.Equal(HttpStatusCode.OK, folderResponse.StatusCode);

    var folder = await folderResponse.Content.ReadFromJsonAsync<FolderResponse>();
    Assert.NotNull(folder);

    var createResponse = await _client.PostAsJsonAsync("/api/documents", new
    {
      title = "מסמך עם תיקייה",
      folderId = folder!.id,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

    var created = await createResponse.Content.ReadFromJsonAsync<DocumentResponse>();
    Assert.NotNull(created);
    Assert.Equal(folder.id, created!.folderId);

    var updateResponse = await _client.PutAsJsonAsync($"/api/documents/{created.id}", new
    {
      title = "מסמך ללא תיקייה",
      folderId = (int?)null,
      contentJson = """{"version":1,"blocks":[],"pages":[]}"""
    });

    Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

    var updated = await updateResponse.Content.ReadFromJsonAsync<DocumentResponse>();

    Assert.NotNull(updated);
    Assert.Null(updated!.folderId);
    Assert.Null(updated.folderName);
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
