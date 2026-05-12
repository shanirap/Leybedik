using System.ComponentModel.DataAnnotations;

namespace Leybedik.Api.Dtos.Documents;

public class UpdateDocumentRequest
{
  [Required]
  [MaxLength(255)]
  public string Title { get; set; } = string.Empty;

  [Required]
  public string ContentJson { get; set; } = "{}";
}
