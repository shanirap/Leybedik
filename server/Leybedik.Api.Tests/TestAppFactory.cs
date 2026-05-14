using Leybedik.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Leybedik.Api.Tests;

public class TestAppFactory : WebApplicationFactory<Program>
{
  private readonly string _databaseName = $"LeybedikTests-{Guid.NewGuid()}";

  protected override void ConfigureWebHost(IWebHostBuilder builder)
  {
    builder.UseEnvironment("Development");

    builder.ConfigureServices(services =>
    {
      services.RemoveAll<DbContextOptions<LeybedikDbContext>>();

      services.AddDbContext<LeybedikDbContext>(options =>
      {
        options.UseInMemoryDatabase(_databaseName);
      });
    });
  }
}