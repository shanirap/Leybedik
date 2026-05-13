namespace Leybedik.Api.Dtos.Documents;

public class DocumentDto
{
  public int Id { get; set; }
  public string Title { get; set; } = string.Empty;
  public string Folder { get; set; } = "general";
  public string ContentJson { get; set; } = string.Empty;
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}
