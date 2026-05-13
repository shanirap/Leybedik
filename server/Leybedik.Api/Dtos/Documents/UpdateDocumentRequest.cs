using System.ComponentModel.DataAnnotations;

namespace Leybedik.Api.Dtos.Documents;

public class UpdateDocumentRequest
{
  [Required]
  [MaxLength(255)]
  public string Title { get; set; } = string.Empty;

  [MaxLength(50)]
  public string Folder { get; set; } = "general";

  [Required]
  public string ContentJson { get; set; } = "{}";
}
