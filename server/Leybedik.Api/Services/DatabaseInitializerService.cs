using Leybedik.Api.Data;
using Leybedik.Api.Options;
using Microsoft.EntityFrameworkCore;

namespace Leybedik.Api.Services;

public class DatabaseInitializerService : IHostedService
{
  private readonly IServiceScopeFactory _scopeFactory;
  private readonly IConfiguration _configuration;
  private readonly ILogger<DatabaseInitializerService> _logger;

  public DatabaseInitializerService(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<DatabaseInitializerService> logger)
  {
    _scopeFactory = scopeFactory;
    _configuration = configuration;
    _logger = logger;
  }

  public async Task StartAsync(CancellationToken cancellationToken)
  {
    var options = _configuration
      .GetSection(DatabaseOptions.SectionName)
      .Get<DatabaseOptions>() ?? new DatabaseOptions();

    if (!options.AutoMigrate)
      return;

    await using var scope = _scopeFactory.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<LeybedikDbContext>();

    var provider = options.Provider?.Trim() ?? "SqlServer";

    if (string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase))
    {
      await db.Database.EnsureCreatedAsync(cancellationToken);
      _logger.LogInformation("SQLite database was created or already exists.");
      return;
    }

    await db.Database.MigrateAsync(cancellationToken);
    _logger.LogInformation("Database migrations were applied or already up to date.");
  }

  public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}