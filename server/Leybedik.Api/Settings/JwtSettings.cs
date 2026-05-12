namespace Leybedik.Api.Settings;

public class JwtSettings
{
  public const string SectionName = "Jwt";

  public string Key { get; set; } = string.Empty;
  public string Issuer { get; set; } = string.Empty;
  public string Audience { get; set; } = string.Empty;
  public int ExpiresDays { get; set; } = 7;
}
