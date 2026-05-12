namespace Leybedik.Api.Options;

public class AiScanImportOptions
{
  public string Provider { get; set; } = "Gemini";
  public string ApiKey { get; set; } = string.Empty;
  public string Model { get; set; } = "gemini-2.5-flash";
  public string Endpoint { get; set; } = "https://generativelanguage.googleapis.com";
}
