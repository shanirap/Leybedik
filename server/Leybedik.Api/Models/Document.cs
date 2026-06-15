using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Leybedik.Api.Models;

public class Document
{
  public int Id { get; set; }

  public int OwnerUserId { get; set; }

  public AppUser OwnerUser { get; set; } = null!;

  [Required]
  [MaxLength(255)]
  public string Title { get; set; } = string.Empty;

  public int? FolderId { get; set; }

  public DocumentFolder? Folder { get; set; }
  
  [Required]
  public string ContentJson { get; set; } = string.Empty;

  public DateTime CreatedAt { get; set; }

  public DateTime UpdatedAt { get; set; }

  public bool IsDeleted { get; set; }
}
