using Leybedik.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
namespace Leybedik.Api.Data;

public class LeybedikDbContext : DbContext
{
  public LeybedikDbContext(DbContextOptions<LeybedikDbContext> options)
    : base(options)
  {
  }

  public DbSet<AppUser> Users => Set<AppUser>();
  public DbSet<Document> Documents => Set<Document>();
  public DbSet<DocumentFolder> DocumentFolders => Set<DocumentFolder>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.Entity<AppUser>(entity =>
    {
      entity.ToTable("Users");
      entity.HasIndex(u => u.Email).IsUnique();
    });

    modelBuilder.Entity<DocumentFolder>(entity =>
    {
      entity.ToTable("DocumentFolders");

      entity.Property(f => f.Name)
        .HasMaxLength(100)
        .IsRequired();

      entity.HasOne(f => f.OwnerUser)
        .WithMany()
        .HasForeignKey(f => f.OwnerUserId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasIndex(f => new { f.OwnerUserId, f.Name })
        .IsUnique();

      entity.HasQueryFilter(f => !f.IsDeleted);
    });

    modelBuilder.Entity<Document>(entity =>
    {
      entity.ToTable("Documents");

      var contentJsonProperty = entity.Property(d => d.ContentJson)
        .IsRequired();

      if (Database.IsSqlServer())
      {
        contentJsonProperty.HasColumnType("nvarchar(max)");
      }

      entity.HasOne(d => d.OwnerUser)
        .WithMany(u => u.Documents)
        .HasForeignKey(d => d.OwnerUserId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasOne(d => d.Folder)
      .WithMany()
      .HasForeignKey(d => d.FolderId)
      .OnDelete(DeleteBehavior.NoAction);

      entity.HasQueryFilter(d => !d.IsDeleted);
    });
  }
}