using Leybedik.Api.Dtos.Imports;

namespace Leybedik.Api.Services.Imports;

public class ScanImportContentValidator
{
  public List<string> Validate(ScanImportContent? content)
  {
    var messages = new List<string>();

    if (content is null)
    {
      messages.Add("Scan import content is null.");
      return messages;
    }

    if (content.Version != ScanImportSchema.ExpectedVersion)
    {
      messages.Add(
        $"Expected content version {ScanImportSchema.ExpectedVersion}, got {content.Version}.");
    }

    if (content.Blocks is null)
    {
      messages.Add("Blocks must not be null.");
      return messages;
    }

    if (content.Blocks.Count == 0)
    {
      messages.Add("Blocks collection is empty.");
    }

    for (var i = 0; i < content.Blocks.Count; i++)
    {
      var block = content.Blocks[i];
      if (block is null)
      {
        messages.Add($"Block at index {i} is null.");
        continue;
      }

      if (string.IsNullOrWhiteSpace(block.Id))
      {
        messages.Add($"Block at index {i} has empty Id.");
      }

      var bt = block.Type?.Trim() ?? "";
      if (!ScanImportSchema.ValidBlockTypes.Contains(bt))
      {
        messages.Add($"Block at index {i} has invalid type '{block.Type}'.");
      }

      if (block.Elements is null)
      {
        messages.Add($"Block at index {i} has null Elements.");
        continue;
      }

      for (var j = 0; j < block.Elements.Count; j++)
      {
        var el = block.Elements[j];
        if (el is null)
        {
          messages.Add($"Element at block {i}, index {j} is null.");
          continue;
        }

        if (string.IsNullOrWhiteSpace(el.Id))
        {
          messages.Add($"Element at block {i}, index {j} has empty Id.");
        }

        var et = el.Type?.Trim() ?? "";
        if (!ScanImportSchema.ValidElementTypes.Contains(et))
        {
          messages.Add(
            $"Element at block {i}, index {j} has invalid type '{el.Type}'.");
        }

        if (el.X < ScanImportSchema.MinX || el.X > ScanImportSchema.MaxX ||
            el.Y < ScanImportSchema.MinY || el.Y > ScanImportSchema.MaxY)
        {
          messages.Add(
            $"Element at block {i}, index {j} has coordinates out of range (x={el.X}, y={el.Y}).");
        }
      }
    }

    return messages;
  }
}
