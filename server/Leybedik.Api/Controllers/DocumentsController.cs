using Leybedik.Api.Data;
using Leybedik.Api.Dtos.Documents;
using Leybedik.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Leybedik.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/documents")]
public class DocumentsController : ControllerBase
{
  private const int MaxContentJsonLength = 5 * 1024 * 1024; // 5 MB
  private readonly LeybedikDbContext _db;

  public DocumentsController(LeybedikDbContext db)
  {
    _db = db;
  }

private static bool IsContentJsonTooLarge(string? contentJson)
{
    return !string.IsNullOrEmpty(contentJson)
        && System.Text.Encoding.UTF8.GetByteCount(contentJson) > MaxContentJsonLength;
}

  private int? GetUserId()
  {
    var value =
      User.FindFirst("userId")?.Value ??
      User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

    return int.TryParse(value, out var id) ? id : null;
  }

  private async Task<bool> FolderBelongsToUserAsync(int folderId, int userId)
  {
    return await _db.DocumentFolders.AnyAsync(folder =>
      folder.Id == folderId &&
      folder.OwnerUserId == userId);
  }

  [HttpGet]
  public async Task<ActionResult<List<DocumentListItemDto>>> GetMine()
  {
    var userId = GetUserId();

    if (userId is null)
    {
      return Unauthorized();
    }

    var documents = await _db.Documents
      .Include(document => document.Folder)
      .Where(document => document.OwnerUserId == userId.Value)
      .OrderByDescending(document => document.UpdatedAt)
      .Select(document => new DocumentListItemDto
      {
        Id = document.Id,
        Title = document.Title,
        FolderId = document.FolderId,
        FolderName = document.Folder != null ? document.Folder.Name : null,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt,
      })
      .ToListAsync();

    return Ok(documents);
  }

  [HttpGet("{id:int}")]
  public async Task<ActionResult<DocumentDto>> GetById(int id)
  {
    var userId = GetUserId();

    if (userId is null)
    {
      return Unauthorized();
    }

    var document = await _db.Documents
      .Include(item => item.Folder)
      .Where(item =>
        item.Id == id &&
        item.OwnerUserId == userId.Value)
      .Select(item => new DocumentDto
      {
        Id = item.Id,
        Title = item.Title,
        FolderId = item.FolderId,
        FolderName = item.Folder != null ? item.Folder.Name : null,
        ContentJson = item.ContentJson,
        CreatedAt = item.CreatedAt,
        UpdatedAt = item.UpdatedAt,
      })
      .FirstOrDefaultAsync();

    if (document is null)
    {
      return NotFound();
    }

    return Ok(document);
  }

  [HttpPost]
  public async Task<ActionResult<DocumentDto>> Create(CreateDocumentRequest request)
  {
    var userId = GetUserId();

    if (userId is null)
    {
      return Unauthorized();
    }
if (IsContentJsonTooLarge(request.ContentJson))
{
    return BadRequest(new { message = "המסמך גדול מדי לשמירה." });
}
    if (request.FolderId is not null)
    {
      var folderExists = await FolderBelongsToUserAsync(
        request.FolderId.Value,
        userId.Value
      );

      if (!folderExists)
      {
        return BadRequest("התיקייה שנבחרה לא קיימת.");
      }
    }

    var now = DateTime.UtcNow;

    var entity = new Document
    {
      OwnerUserId = userId.Value,
      Title = request.Title.Trim(),
      FolderId = request.FolderId,
      ContentJson = request.ContentJson,
      CreatedAt = now,
      UpdatedAt = now,
      IsDeleted = false,
    };

    _db.Documents.Add(entity);
    await _db.SaveChangesAsync();

    var savedDocument = await _db.Documents
      .Include(document => document.Folder)
      .FirstAsync(document => document.Id == entity.Id);

    var dto = new DocumentDto
    {
      Id = savedDocument.Id,
      Title = savedDocument.Title,
      FolderId = savedDocument.FolderId,
      FolderName = savedDocument.Folder != null ? savedDocument.Folder.Name : null,
      ContentJson = savedDocument.ContentJson,
      CreatedAt = savedDocument.CreatedAt,
      UpdatedAt = savedDocument.UpdatedAt,
    };

    return Ok(dto);
  }

  [HttpPut("{id:int}")]
  public async Task<ActionResult<DocumentDto>> Update(
    int id,
    UpdateDocumentRequest request
  )
  {
    var userId = GetUserId();

    if (userId is null)
    {
      return Unauthorized();
    }

    var entity = await _db.Documents
      .FirstOrDefaultAsync(document =>
        document.Id == id &&
        document.OwnerUserId == userId.Value);

    if (entity is null)
    {
      return NotFound();
    }
    if (IsContentJsonTooLarge(request.ContentJson))
    {
        return BadRequest(new { message = "המסמך גדול מדי לשמירה." });
    }
    
    if (request.FolderId is not null)
    {
      var folderExists = await FolderBelongsToUserAsync(
        request.FolderId.Value,
        userId.Value
      );

      if (!folderExists)
      {
        return BadRequest("התיקייה שנבחרה לא קיימת.");
      }
    }

    entity.Title = request.Title.Trim();
    entity.FolderId = request.FolderId;
    entity.ContentJson = request.ContentJson;
    entity.UpdatedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();

    var savedDocument = await _db.Documents
      .Include(document => document.Folder)
      .FirstAsync(document => document.Id == entity.Id);

    return Ok(new DocumentDto
    {
      Id = savedDocument.Id,
      Title = savedDocument.Title,
      FolderId = savedDocument.FolderId,
      FolderName = savedDocument.Folder != null ? savedDocument.Folder.Name : null,
      ContentJson = savedDocument.ContentJson,
      CreatedAt = savedDocument.CreatedAt,
      UpdatedAt = savedDocument.UpdatedAt,
    });
  }

  [HttpDelete("{id:int}")]
  public async Task<IActionResult> Delete(int id)
  {
    var userId = GetUserId();

    if (userId is null)
    {
      return Unauthorized();
    }

    var entity = await _db.Documents
      .FirstOrDefaultAsync(document =>
        document.Id == id &&
        document.OwnerUserId == userId.Value);

    if (entity is null)
    {
      return NotFound();
    }

    entity.IsDeleted = true;
    entity.UpdatedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();

    return NoContent();
  }
  
}