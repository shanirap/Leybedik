using Leybedik.Api.Data;
using Leybedik.Api.Dtos.Folders;
using Leybedik.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Leybedik.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/folders")]
public class FoldersController : ControllerBase
{
  private readonly LeybedikDbContext _db;

  public FoldersController(LeybedikDbContext db)
  {
    _db = db;
  }

  private int? GetUserId()
  {
    var value =
      User.FindFirst("userId")?.Value ??
      User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

    return int.TryParse(value, out var id) ? id : null;
  }

  [HttpGet]
  public async Task<ActionResult<List<FolderDto>>> GetMine()
  {
    var userId = GetUserId();

    if (userId is null)
    {
      return Unauthorized();
    }

    var folders = await _db.DocumentFolders
      .Where(folder => folder.OwnerUserId == userId.Value)
      .OrderBy(folder => folder.Name)
      .Select(folder => new FolderDto
      {
        Id = folder.Id,
        Name = folder.Name,
        DocumentsCount = _db.Documents.Count(document =>
          document.OwnerUserId == userId.Value &&
          document.FolderId == folder.Id)
      })
      .ToListAsync();

    return Ok(folders);
  }

  [HttpPost]
  public async Task<ActionResult<FolderDto>> Create(CreateFolderRequest request)
  {
    var userId = GetUserId();

    if (userId is null)
    {
      return Unauthorized();
    }

    var name = request.Name.Trim();

    if (string.IsNullOrWhiteSpace(name))
    {
      return BadRequest("שם תיקייה הוא שדה חובה.");
    }

    var exists = await _db.DocumentFolders.AnyAsync(folder =>
      folder.OwnerUserId == userId.Value &&
      folder.Name == name);

    if (exists)
    {
      return Conflict("כבר קיימת תיקייה בשם הזה.");
    }

    var now = DateTime.UtcNow;

    var folder = new DocumentFolder
    {
      OwnerUserId = userId.Value,
      Name = name,
      CreatedAt = now,
      UpdatedAt = now,
      IsDeleted = false,
    };

    _db.DocumentFolders.Add(folder);
    await _db.SaveChangesAsync();

    return Ok(new FolderDto
    {
      Id = folder.Id,
      Name = folder.Name,
      DocumentsCount = 0,
    });
  }

  [HttpPut("{id:int}")]
  public async Task<ActionResult<FolderDto>> Update(
    int id,
    UpdateFolderRequest request
  )
  {
    var userId = GetUserId();

    if (userId is null)
    {
      return Unauthorized();
    }

    var name = request.Name.Trim();

    if (string.IsNullOrWhiteSpace(name))
    {
      return BadRequest("שם תיקייה הוא שדה חובה.");
    }

    var folder = await _db.DocumentFolders.FirstOrDefaultAsync(item =>
      item.Id == id &&
      item.OwnerUserId == userId.Value);

    if (folder is null)
    {
      return NotFound();
    }

    var exists = await _db.DocumentFolders.AnyAsync(item =>
      item.OwnerUserId == userId.Value &&
      item.Id != id &&
      item.Name == name);

    if (exists)
    {
      return Conflict("כבר קיימת תיקייה בשם הזה.");
    }

    folder.Name = name;
    folder.UpdatedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();

    var count = await _db.Documents.CountAsync(document =>
      document.OwnerUserId == userId.Value &&
      document.FolderId == folder.Id);

    return Ok(new FolderDto
    {
      Id = folder.Id,
      Name = folder.Name,
      DocumentsCount = count,
    });
  }
}