using Leybedik.Api.Dtos.Imports;

namespace Leybedik.Api.Services.Imports;

public class ScanImportContentNormalizer
{
  public ScanImportContent Normalize(ScanImportContent content)
  {
    ArgumentNullException.ThrowIfNull(content);

    var result = new ScanImportContent
    {
      Version = content.Version <= 0 ? ScanImportSchema.ExpectedVersion : content.Version,
      Blocks = new List<ScanImportBlock>(),
    };

    var blocks = content.Blocks ?? new List<ScanImportBlock>();

    foreach (var block in blocks)
    {
      if (block is null)
      {
        continue;
      }

      var type = block.Type?.Trim() ?? "";
      if (!ScanImportSchema.ValidBlockTypes.Contains(type))
      {
        continue;
      }

      var normalizedBlock = new ScanImportBlock
      {
        Id = string.IsNullOrWhiteSpace(block.Id) ? Guid.NewGuid().ToString() : block.Id.Trim(),
        Type = type,
        Text = block.Text ?? string.Empty,
        Title = block.Title,
        ChordName = block.ChordName,
        Elements = new List<ScanImportElement>(),
      };

      var elements = block.Elements ?? new List<ScanImportElement>();
      foreach (var el in elements)
      {
        if (el is null)
        {
          continue;
        }

        var elType = el.Type?.Trim() ?? "";
        if (!ScanImportSchema.ValidElementTypes.Contains(elType))
        {
          continue;
        }

        normalizedBlock.Elements.Add(new ScanImportElement
        {
          Id = string.IsNullOrWhiteSpace(el.Id) ? Guid.NewGuid().ToString() : el.Id.Trim(),
          Type = elType,
          Value = el.Value,
          X = Clamp(el.X, ScanImportSchema.MinX, ScanImportSchema.MaxX),
          Y = Clamp(el.Y, ScanImportSchema.MinY, ScanImportSchema.MaxY),
        });
      }

      result.Blocks.Add(normalizedBlock);
    }

    if (result.Blocks.Count == 0)
    {
      result.Blocks.Add(new ScanImportBlock
      {
        Id = Guid.NewGuid().ToString(),
        Type = "lyrics",
        Text = ScanImportSchema.FallbackLyricsText,
        Elements = new List<ScanImportElement>(),
      });
    }

    return result;
  }

  private static double Clamp(double value, double min, double max)
  {
    if (value < min)
    {
      return min;
    }

    if (value > max)
    {
      return max;
    }

    return value;
  }
}
