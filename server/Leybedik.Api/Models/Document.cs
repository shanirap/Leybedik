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

  [Required]
  [MaxLength(50)]
  public string Folder { get; set; } = "general";
  
  [Required]
  [Column(TypeName = "nvarchar(max)")]
  public string ContentJson { get; set; } = "{}";

  public DateTime CreatedAt { get; set; }

  public DateTime UpdatedAt { get; set; }

  public bool IsDeleted { get; set; }
}
