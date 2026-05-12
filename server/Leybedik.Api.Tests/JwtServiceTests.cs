using System.IdentityModel.Tokens.Jwt;
using Leybedik.Api.Models;
using Leybedik.Api.Services;
using Leybedik.Api.Settings;
using Microsoft.Extensions.Options;
using Xunit;

namespace Leybedik.Api.Tests;

public class JwtServiceTests
{
  private static JwtService CreateService()
  {
    var settings = new JwtSettings
    {
      Key = "0123456789abcdef0123456789abcdef",
      Issuer = "leybedik-test-issuer",
      Audience = "leybedik-test-audience",
      ExpiresDays = 1,
    };
    return new JwtService(Microsoft.Extensions.Options.Options.Create(settings));
  }

  private static AppUser SampleUser() =>
    new()
    {
      Id = 42,
      Email = "test@example.com",
      DisplayName = "Tester",
      PasswordHash = "hash-not-in-token",
      CreatedAt = DateTime.UtcNow,
    };

  [Fact]
  public void CreateToken_ReturnsNonEmptyString()
  {
    var svc = CreateService();
    var token = svc.CreateToken(SampleUser());
    Assert.False(string.IsNullOrWhiteSpace(token));
  }

  [Fact]
  public void CreateToken_ContainsSubjectEmailAndDisplayNameClaims()
  {
    var user = SampleUser();
    var svc = CreateService();
    var raw = svc.CreateToken(user);

    var jwt = new JwtSecurityTokenHandler().ReadJwtToken(raw);

    Assert.Equal(user.Id.ToString(), jwt.Subject);
    Assert.Contains(jwt.Claims, c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier && c.Value == user.Id.ToString());
    Assert.Contains(jwt.Claims, c => c.Type == System.Security.Claims.ClaimTypes.Email && c.Value == user.Email);
    Assert.Contains(jwt.Claims, c => c.Type == "displayName" && c.Value == user.DisplayName);
  }

  [Fact]
  public void AuthResponseShape_HasNoPasswordField_InDtoContract()
  {
    var props = typeof(Leybedik.Api.Dtos.Auth.AuthResponse).GetProperties().Select(p => p.Name).ToHashSet();
    Assert.DoesNotContain("PasswordHash", props);
    Assert.DoesNotContain("passwordHash", props);
  }
}
