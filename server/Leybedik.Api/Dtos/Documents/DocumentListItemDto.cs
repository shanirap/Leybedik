namespace Leybedik.Api.Dtos.Documents;

public class DocumentListItemDto
{
  public int Id { get; set; }
  public string Title { get; set; } = string.Empty;
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}
