namespace Leybedik.Api.Dtos.Documents;

public class DocumentListItemDto
{
  public int Id { get; set; }
  public string Title { get; set; } = string.Empty;
  public int? FolderId { get; set; }
  public string? FolderName { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}
