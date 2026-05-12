using Leybedik.Api.Dtos.Imports;

namespace Leybedik.Api.Services.Imports;

public interface IScanImportService
{
  Task<ScanImportResponse> ImportAsync(IFormFile file, CancellationToken cancellationToken = default);
}
