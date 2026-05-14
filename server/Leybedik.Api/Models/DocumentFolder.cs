using System.ComponentModel.DataAnnotations;

namespace Leybedik.Api.Models;

public class DocumentFolder
{
    public int Id { get; set; }

    public int OwnerUserId { get; set; }

    public AppUser OwnerUser { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }
}