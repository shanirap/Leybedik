using Leybedik.Api.Data;
using Leybedik.Api.Dtos.Documents;
using Leybedik.Api.Models;
using Leybedik.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Leybedik.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/documents")]
public class DocumentsController : ControllerBase
{
  private readonly LeybedikDbContext _db;

  public DocumentsController(LeybedikDbContext db)
  {
    _db = db;
  }
  private static string NormalizeFolder(string? folder)
  {
    var normalized = (folder ?? "general").Trim();

    return normalized switch
    {
      "general" or "organ" or "guitar" or "violin" or "drums" => normalized,
      _ => "general",
    };
  }
  [HttpGet]
  public async Task<ActionResult<IEnumerable<DocumentListItemDto>>> GetMine()
  {
    var userId = User.GetUserId();
    if (userId is null)
      return Unauthorized();

    var items = await _db.Documents
      .Where(d => d.OwnerUserId == userId.Value)
      .OrderByDescending(d => d.UpdatedAt)
    .Select(d => new DocumentListItemDto
{
  Id = d.Id,
  Title = d.Title,
  Folder = d.Folder,
  CreatedAt = d.CreatedAt,
  UpdatedAt = d.UpdatedAt,
})
      .ToListAsync();

    return Ok(items);
  }

  [HttpGet("{id:int}")]
  public async Task<ActionResult<DocumentDto>> GetById(int id)
  {
    var userId = User.GetUserId();
    if (userId is null)
      return Unauthorized();

    var doc = await _db.Documents
      .Where(d => d.Id == id && d.OwnerUserId == userId.Value)
      .Select(d => new DocumentDto
      {
        Id = d.Id,
        Title = d.Title,
        ContentJson = d.ContentJson,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt,
        Folder = d.Folder,
      })
      .FirstOrDefaultAsync();

    if (doc is null)
      return NotFound();

    return Ok(doc);
  }

  [HttpPost]
  public async Task<ActionResult<DocumentDto>> Create([FromBody] CreateDocumentRequest request)
  {
    var userId = User.GetUserId();
    if (userId is null)
      return Unauthorized();

    var now = DateTime.UtcNow;
    var entity = new Document
    {
      OwnerUserId = userId.Value,
      Title = request.Title.Trim(),
      ContentJson = request.ContentJson,
      CreatedAt = now,
      UpdatedAt = now,
      IsDeleted = false,
      Folder = NormalizeFolder(request.Folder),
    };

    _db.Documents.Add(entity);
    await _db.SaveChangesAsync();

    var dto = new DocumentDto
    {
      Id = entity.Id,
      Title = entity.Title,
      ContentJson = entity.ContentJson,
      CreatedAt = entity.CreatedAt,
      UpdatedAt = entity.UpdatedAt,
      Folder = entity.Folder,
    };

    return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
  }

  [HttpPut("{id:int}")]
  public async Task<ActionResult<DocumentDto>> Update(int id, [FromBody] UpdateDocumentRequest request)
  {
    var userId = User.GetUserId();
    if (userId is null)
      return Unauthorized();

    var entity = await _db.Documents
      .FirstOrDefaultAsync(d => d.Id == id && d.OwnerUserId == userId.Value);

    if (entity is null)
      return NotFound();

    entity.Title = request.Title.Trim();
    entity.ContentJson = request.ContentJson;
    entity.Folder = NormalizeFolder(request.Folder);
    entity.UpdatedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();

    return Ok(new DocumentDto
    {
      Id = entity.Id,
      Title = entity.Title,
      ContentJson = entity.ContentJson,
      CreatedAt = entity.CreatedAt,
      UpdatedAt = entity.UpdatedAt,
      Folder = entity.Folder,
    });
  }

  [HttpDelete("{id:int}")]
  public async Task<IActionResult> SoftDelete(int id)
  {
    var userId = User.GetUserId();
    if (userId is null)
      return Unauthorized();

    var entity = await _db.Documents
      .FirstOrDefaultAsync(d => d.Id == id && d.OwnerUserId == userId.Value);

    if (entity is null)
      return NotFound();

    entity.IsDeleted = true;
    entity.UpdatedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();

    return NoContent();
  }
}
