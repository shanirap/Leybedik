using Leybedik.Api.Dtos.Imports;
using Leybedik.Api.Services.Imports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Leybedik.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/imports")]
public class ImportsController : ControllerBase
{
  private static readonly HashSet<string> AllowedContentTypes =
    new(StringComparer.OrdinalIgnoreCase)
    {
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
    };

  private readonly IScanImportService _scanImportService;

  public ImportsController(IScanImportService scanImportService)
  {
    _scanImportService = scanImportService;
  }

  [HttpPost("scan")]
  public async Task<ActionResult<ScanImportResponse>> ImportScan(
    IFormFile? file,
    CancellationToken cancellationToken)
  {
    if (file is null || file.Length == 0)
    {
      return BadRequest(new { message = "לא הועלה קובץ או שהקובץ ריק." });
    }

    var contentType = file.ContentType?.Trim() ?? "";
    if (!AllowedContentTypes.Contains(contentType))
    {
      return BadRequest(new
      {
        message =
          $"סוג הקובץ לא נתמך. ניתן להעלות תמונה PNG, JPEG או קובץ PDF בלבד. (קיבלנו: {contentType})",
      });
    }

    try
    {
      var result = await _scanImportService.ImportAsync(file, cancellationToken);
      return Ok(result);
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (ScanImportServiceUnavailableException)
    {
      return StatusCode(
        StatusCodes.Status503ServiceUnavailable,
        new { message = "שירות הזיהוי עמוס כרגע. נסי שוב בעוד דקה." });
    }
    catch (Exception)
    {
      return StatusCode(
        StatusCodes.Status502BadGateway,
        new
        {
          message =
            "לא הצלחנו לזהות את הדף. נסי שוב או העלי קובץ אחר.",
        });
    }
  }
}
