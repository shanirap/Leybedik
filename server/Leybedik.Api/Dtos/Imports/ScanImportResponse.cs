namespace Leybedik.Api.Dtos.Imports;

public class ScanImportResponse
{
  public string Title { get; set; } = string.Empty;
  public string ContentJson { get; set; } = string.Empty;
  public List<string> Warnings { get; set; } = new();
}
