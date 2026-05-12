namespace Leybedik.Api.Dtos.Imports;

public class ScanTranscriptionResult
{
  public bool IsReadable { get; set; }
  public string RecognizedText { get; set; } = string.Empty;
  public List<string> Warnings { get; set; } = new();
}
