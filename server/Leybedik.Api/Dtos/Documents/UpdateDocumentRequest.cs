using System.ComponentModel.DataAnnotations;

namespace Leybedik.Api.Dtos.Documents;

public class UpdateDocumentRequest
{
  [Required]
  [MaxLength(255)]
  public string Title { get; set; } = string.Empty;

  public int? FolderId { get; set; }

  [Required]
  public string ContentJson { get; set; } = "{}";
}
