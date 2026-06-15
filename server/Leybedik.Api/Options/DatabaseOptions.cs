namespace Leybedik.Api.Options;

public class DatabaseOptions
{
  public const string SectionName = "Database";

  public string Provider { get; set; } = "SqlServer";

  public bool AutoMigrate { get; set; }
}