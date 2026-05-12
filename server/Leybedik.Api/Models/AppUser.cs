using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Leybedik.Api.Models;

public class AppUser
{
  public int Id { get; set; }

  [Required]
  [MaxLength(255)]
  public string Email { get; set; } = string.Empty;

  [Required]
  [MaxLength(255)]
  public string DisplayName { get; set; } = string.Empty;

  [Required]
  public string PasswordHash { get; set; } = string.Empty;

  public DateTime CreatedAt { get; set; }

  public ICollection<Document> Documents { get; set; } = new List<Document>();
}
