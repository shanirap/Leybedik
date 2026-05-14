using System.ComponentModel.DataAnnotations;

namespace Leybedik.Api.Dtos.Folders;

public class CreateFolderRequest
{
  [Required]
  [MaxLength(100)]
  public string Name { get; set; } = string.Empty;
}