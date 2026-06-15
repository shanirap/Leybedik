using Leybedik.Api.Data;
using Leybedik.Api.Models;
using Leybedik.Api.Options;
using Microsoft.EntityFrameworkCore;

namespace Leybedik.Api.Services;

public class BootstrapInitialUserService : IHostedService
{
  private readonly IServiceScopeFactory _scopeFactory;
  private readonly IConfiguration _configuration;
  private readonly ILogger<BootstrapInitialUserService> _logger;

  public BootstrapInitialUserService(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<BootstrapInitialUserService> logger)
  {
    _scopeFactory = scopeFactory;
    _configuration = configuration;
    _logger = logger;
  }

  public async Task StartAsync(CancellationToken cancellationToken)
  {
    var options = _configuration
      .GetSection(BootstrapUserOptions.SectionName)
      .Get<BootstrapUserOptions>() ?? new BootstrapUserOptions();

    if (!options.Enabled)
      return;

    var email = options.Email.Trim();
    var displayName = options.DisplayName.Trim();
    var password = options.Password;

    if (string.IsNullOrWhiteSpace(email) ||
        string.IsNullOrWhiteSpace(displayName) ||
        string.IsNullOrWhiteSpace(password))
    {
      _logger.LogWarning(
        "Bootstrap user is enabled, but Email, DisplayName or Password is missing.");
      return;
    }

    await using var scope = _scopeFactory.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<LeybedikDbContext>();

    var hasAnyUsers = await db.Users.AnyAsync(cancellationToken);
    if (hasAnyUsers)
    {
      _logger.LogInformation("Bootstrap user was skipped because users already exist.");
      return;
    }

    var user = new AppUser
    {
      Email = email,
      DisplayName = displayName,
      PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
      CreatedAt = DateTime.UtcNow,
    };

    db.Users.Add(user);
    await db.SaveChangesAsync(cancellationToken);

    _logger.LogInformation("Bootstrap user was created successfully: {Email}", email);
  }

  public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}