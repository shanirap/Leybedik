using Leybedik.Api.Data;
using Leybedik.Api.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Leybedik.Api.Tests;

public class LeybedikDbContextTests
{
  private static LeybedikDbContext CreateContext()
  {
    var options = new DbContextOptionsBuilder<LeybedikDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new LeybedikDbContext(options);
  }

  [Fact]
  public async Task Documents_QueryFilter_Hides_IsDeleted()
  {
    await using var db = CreateContext();

    var owner = new AppUser
    {
      Email = "a@test.local",
      DisplayName = "A",
      PasswordHash = "x",
      CreatedAt = DateTime.UtcNow,
    };
    db.Users.Add(owner);
    await db.SaveChangesAsync();

    var alive = new Document
    {
      OwnerUserId = owner.Id,
      Title = "Visible",
      ContentJson = """{"version":1,"blocks":[]}""",
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow,
      IsDeleted = false,
    };
    var gone = new Document
    {
      OwnerUserId = owner.Id,
      Title = "SoftDeleted",
      ContentJson = "{}",
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow,
      IsDeleted = true,
    };
    db.Documents.AddRange(alive, gone);
    await db.SaveChangesAsync();

    var visible = await db.Documents.AsNoTracking().ToListAsync();
    Assert.Single(visible);
    Assert.Equal("Visible", visible[0].Title);
  }

  [Fact]
  public async Task Documents_OtherUsersRow_NotReturned_ForOwnerQuery()
  {
    await using var db = CreateContext();

    var userA = new AppUser
    {
      Email = "a2@test.local",
      DisplayName = "A",
      PasswordHash = "x",
      CreatedAt = DateTime.UtcNow,
    };
    var userB = new AppUser
    {
      Email = "b2@test.local",
      DisplayName = "B",
      PasswordHash = "x",
      CreatedAt = DateTime.UtcNow,
    };
    db.Users.AddRange(userA, userB);
    await db.SaveChangesAsync();

    var docA = new Document
    {
      OwnerUserId = userA.Id,
      Title = "OnlyA",
      ContentJson = """{"version":1,"blocks":[]}""",
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow,
      IsDeleted = false,
    };
    db.Documents.Add(docA);
    await db.SaveChangesAsync();

    var forB = await db.Documents.AsNoTracking()
      .Where(d => d.OwnerUserId == userB.Id && d.Id == docA.Id)
      .FirstOrDefaultAsync();

    Assert.Null(forB);
  }

  [Fact]
  public async Task Document_ContentJson_Persisted_AsString()
  {
    await using var db = CreateContext();

    var owner = new AppUser
    {
      Email = "c@test.local",
      DisplayName = "C",
      PasswordHash = "x",
      CreatedAt = DateTime.UtcNow,
    };
    db.Users.Add(owner);
    await db.SaveChangesAsync();

    var payload =
      """{"version":1,"blocks":[{"id":"b1","type":"lyrics","text":"hello","elements":[]}]}""";
    var entity = new Document
    {
      OwnerUserId = owner.Id,
      Title = "Json",
      ContentJson = payload,
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow,
      IsDeleted = false,
    };
    db.Documents.Add(entity);
    await db.SaveChangesAsync();

    var loaded = await db.Documents.AsNoTracking().SingleAsync();
    Assert.Equal(payload, loaded.ContentJson);
  }

  [Fact]
  public async Task SoftDelete_Sets_IsDeletedTrue_AndRow_FilteredFromDefaultQuery()
  {
    await using var db = CreateContext();

    var owner = new AppUser
    {
      Email = "d@test.local",
      DisplayName = "D",
      PasswordHash = "x",
      CreatedAt = DateTime.UtcNow,
    };
    db.Users.Add(owner);
    await db.SaveChangesAsync();

    var doc = new Document
    {
      OwnerUserId = owner.Id,
      Title = "ToDelete",
      ContentJson = "{}",
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow,
      IsDeleted = false,
    };
    db.Documents.Add(doc);
    await db.SaveChangesAsync();

    doc.IsDeleted = true;
    doc.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    Assert.Empty(await db.Documents.AsNoTracking().ToListAsync());
    Assert.Single(await db.Documents.IgnoreQueryFilters().AsNoTracking().Where(d => d.Id == doc.Id).ToListAsync());
  }
}
