using System.Security.Claims;

namespace Leybedik.Api.Services;

/// <summary>
/// עוזר לקריאת מזהה משתמש מה-JWT claims.
/// </summary>
public static class UserClaimsExtensions
{
  public static int? GetUserId(this ClaimsPrincipal user)
  {
    var value = user.FindFirstValue(ClaimTypes.NameIdentifier);
    return int.TryParse(value, out var id) ? id : null;
  }
}
