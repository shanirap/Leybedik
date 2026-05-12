using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Leybedik.Api.Models;
using Leybedik.Api.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Leybedik.Api.Services;

public class JwtService
{
  private readonly JwtSettings _jwt;

  public JwtService(IOptions<JwtSettings> jwtOptions)
  {
    _jwt = jwtOptions.Value;
  }

  /// <summary>
  /// יוצר JWT עם מזהה משתמש, אימייל ושם תצוגה. תוקף לפי Jwt:ExpiresDays (ברירת מחדל 7 ימים).
  /// </summary>
  public string CreateToken(AppUser user)
  {
    var claims = new List<Claim>
    {
      new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
      new(ClaimTypes.NameIdentifier, user.Id.ToString()),
      new(ClaimTypes.Email, user.Email),
      new("displayName", user.DisplayName),
    };

    var keyBytes = Encoding.UTF8.GetBytes(_jwt.Key);
    var signingKey = new SymmetricSecurityKey(keyBytes);
    var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
      issuer: _jwt.Issuer,
      audience: _jwt.Audience,
      claims: claims,
      expires: DateTime.UtcNow.AddDays(_jwt.ExpiresDays),
      signingCredentials: credentials);

    return new JwtSecurityTokenHandler().WriteToken(token);
  }
}
