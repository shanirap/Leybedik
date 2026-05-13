namespace Leybedik.Api.Dtos.Documents;

public class DocumentListItemDto
{
  public int Id { get; set; }
  public string Title { get; set; } = string.Empty;
  public string Folder { get; set; } = "general";
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}
