using Leybedik.Api.Data;
using Leybedik.Api.Dtos.Auth;
using Leybedik.Api.Models;
using Leybedik.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Leybedik.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
  private readonly LeybedikDbContext _db;
  private readonly JwtService _jwt;

  public AuthController(LeybedikDbContext db, JwtService jwt)
  {
    _db = db;
    _jwt = jwt;
  }

  [HttpPost("register")]
  public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
  {
    var normalizedEmail = request.Email.Trim().ToLowerInvariant();

    var exists = await _db.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
    if (exists)
      return Conflict(new { message = "כתובת האימייל כבר רשומה במערכת." });

    var user = new AppUser
    {
      Email = request.Email.Trim(),
      DisplayName = request.DisplayName.Trim(),
      PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
      CreatedAt = DateTime.UtcNow,
    };

    _db.Users.Add(user);
    await _db.SaveChangesAsync();

    return Ok(new AuthResponse
    {
      Token = _jwt.CreateToken(user),
      Email = user.Email,
      DisplayName = user.DisplayName,
    });
  }

  [HttpPost("login")]
  public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
  {
    var normalizedEmail = request.Email.Trim().ToLowerInvariant();

    var user = await _db.Users.FirstOrDefaultAsync(u =>
      u.Email.ToLower() == normalizedEmail);

    if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
      return Unauthorized(new { message = "אימייל או סיסמה שגויים." });

    return Ok(new AuthResponse
    {
      Token = _jwt.CreateToken(user),
      Email = user.Email,
      DisplayName = user.DisplayName,
    });
  }
}
