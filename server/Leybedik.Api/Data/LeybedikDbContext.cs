using Leybedik.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Leybedik.Api.Data;

public class LeybedikDbContext : DbContext
{
  public LeybedikDbContext(DbContextOptions<LeybedikDbContext> options)
    : base(options)
  {
  }

  public DbSet<AppUser> Users => Set<AppUser>();
  public DbSet<Document> Documents => Set<Document>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.Entity<AppUser>(entity =>
    {
      entity.ToTable("Users");
      entity.HasIndex(u => u.Email).IsUnique();
    });

    modelBuilder.Entity<Document>(entity =>
    {
      entity.ToTable("Documents");
      entity.Property(d => d.Folder).HasMaxLength(50).HasDefaultValue("general");
      entity.Property(d => d.ContentJson).HasColumnType("nvarchar(max)");
      entity.HasOne(d => d.OwnerUser)
        .WithMany(u => u.Documents)
        .HasForeignKey(d => d.OwnerUserId)
        .OnDelete(DeleteBehavior.Cascade);
      entity.HasQueryFilter(d => !d.IsDeleted);
    });
  }
}
