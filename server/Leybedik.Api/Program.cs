using System.Text;
using Leybedik.Api.Data;
using Leybedik.Api.Options;
using Leybedik.Api.Services;
using Leybedik.Api.Services.Ai;
using Leybedik.Api.Services.Images;
using Leybedik.Api.Services.Imports;
using Leybedik.Api.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtSettings>(
  builder.Configuration.GetSection(JwtSettings.SectionName));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
  options.SwaggerDoc("v1", new OpenApiInfo { Title = "Leybedik API", Version = "v1" });
  options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
  {
    Description =
      "JWT בכותרת Authorization. דוגמה: Bearer {token}",
    Name = "Authorization",
    In = ParameterLocation.Header,
    Type = SecuritySchemeType.Http,
    Scheme = "bearer",
    BearerFormat = "JWT",
  });
  options.AddSecurityRequirement(new OpenApiSecurityRequirement
  {
    {
      new OpenApiSecurityScheme
      {
        Reference = new OpenApiReference
        {
          Type = ReferenceType.SecurityScheme,
          Id = "Bearer",
        },
      },
      Array.Empty<string>()
    },
  });
});

builder.Services.AddDbContext<LeybedikDbContext>(options =>
  options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<ScanImportContentValidator>();
builder.Services.AddScoped<ScanImportContentNormalizer>();
builder.Services.AddScoped<ScanImportPromptBuilder>();
builder.Services.AddScoped<ScanImportJsonExtractor>();
builder.Services.AddScoped<IImagePreprocessor, ImagePreprocessor>();

builder.Services.Configure<AiScanImportOptions>(
  builder.Configuration.GetSection("AiScanImport"));

var aiScanImportOpts =
  builder.Configuration.GetSection("AiScanImport").Get<AiScanImportOptions>()
  ?? new AiScanImportOptions();
var aiVisionProviderRaw = aiScanImportOpts.Provider?.Trim();
var aiVisionProvider =
  string.IsNullOrEmpty(aiVisionProviderRaw) ? "Gemini" : aiVisionProviderRaw;

if (!string.Equals(aiVisionProvider, "Gemini", StringComparison.OrdinalIgnoreCase))
{
  throw new InvalidOperationException(
    $"Unsupported AI scan import provider: {aiVisionProvider}");
}

builder.Services.AddHttpClient<IAiVisionClient, GeminiVisionClient>();

builder.Services.Configure<ScanImportOptions>(
  builder.Configuration.GetSection("ScanImport"));

var scanImportOptions =
  builder.Configuration.GetSection("ScanImport").Get<ScanImportOptions>()
  ?? new ScanImportOptions();
var scanImportProviderRaw = scanImportOptions.Provider?.Trim();
var scanImportProvider =
  string.IsNullOrEmpty(scanImportProviderRaw) ? "Mock" : scanImportProviderRaw;

if (string.Equals(scanImportProvider, "AI", StringComparison.OrdinalIgnoreCase))
{
  builder.Services.AddScoped<IScanImportService, AiScanImportService>();
}
else if (string.Equals(scanImportProvider, "Mock", StringComparison.OrdinalIgnoreCase))
{
  builder.Services.AddScoped<IScanImportService, MockScanImportService>();
}
else
{
  throw new InvalidOperationException(
    $"Unsupported ScanImport provider: {scanImportProvider}");
}

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
  ?? throw new InvalidOperationException("Missing Jwt configuration (Key, Issuer, Audience).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(options =>
  {
    options.TokenValidationParameters = new TokenValidationParameters
    {
      ValidateIssuer = true,
      ValidateAudience = true,
      ValidateLifetime = true,
      ValidateIssuerSigningKey = true,
      ValidIssuer = jwtSettings.Issuer,
      ValidAudience = jwtSettings.Audience,
      IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
      ClockSkew = TimeSpan.FromMinutes(2),
    };
  });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
  options.AddPolicy("ReactDev", policy =>
    policy.WithOrigins("http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175")
      .AllowAnyHeader()
      .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("ReactDev");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
