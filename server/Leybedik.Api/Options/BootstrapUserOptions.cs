using System.ComponentModel.DataAnnotations;

namespace Leybedik.Api.Options;

public class BootstrapUserOptions
{
  public const string SectionName = "BootstrapUser";

  public bool Enabled { get; set; }

  [EmailAddress]
  public string Email { get; set; } = string.Empty;

  public string DisplayName { get; set; } = string.Empty;

  public string Password { get; set; } = string.Empty;
}