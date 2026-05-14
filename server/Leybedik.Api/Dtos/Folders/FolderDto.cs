namespace Leybedik.Api.Dtos.Folders;

public class FolderDto
{
  public int Id { get; set; }

  public string Name { get; set; } = string.Empty;

  public int DocumentsCount { get; set; }
}