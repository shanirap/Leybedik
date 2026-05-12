using Leybedik.Api.Dtos.Imports;
using Leybedik.Api.Services.Imports;
using Xunit;

namespace Leybedik.Api.Tests;

public class ScanImportContentNormalizerTests
{
  private readonly ScanImportContentNormalizer _normalizer = new();

  [Fact]
  public void Normalize_GeneratesIds_WhenMissing()
  {
    var content = new ScanImportContent
    {
      Version = 1,
      Blocks =
      [
        new ScanImportBlock
        {
          Id = "",
          Type = "lyrics",
          Text = "a",
          Elements =
          [
            new ScanImportElement { Id = "", Type = "chord", Value = "C", X = 10, Y = 10 },
          ],
        },
      ],
    };

    var result = _normalizer.Normalize(content);

    Assert.False(string.IsNullOrWhiteSpace(result.Blocks[0].Id));
    Assert.False(string.IsNullOrWhiteSpace(result.Blocks[0].Elements[0].Id));
  }

  [Fact]
  public void Normalize_TextNull_BecomesEmpty()
  {
    var content = new ScanImportContent
    {
      Blocks =
      [
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "tabs",
          Text = null,
          Elements = [],
        },
      ],
    };

    var result = _normalizer.Normalize(content);

    Assert.Equal(string.Empty, result.Blocks[0].Text);
  }

  [Fact]
  public void Normalize_RemovesInvalidBlockType()
  {
    var content = new ScanImportContent
    {
      Blocks =
      [
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "unknownBlock",
          Text = "x",
          Elements = [],
        },
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "lyrics",
          Text = "ok",
          Elements = [],
        },
      ],
    };

    var result = _normalizer.Normalize(content);

    Assert.Single(result.Blocks);
    Assert.Equal("lyrics", result.Blocks[0].Type);
  }

  [Fact]
  public void Normalize_RemovesInvalidElementType()
  {
    var content = new ScanImportContent
    {
      Blocks =
      [
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "lyrics",
          Text = "t",
          Elements =
          [
            new ScanImportElement
            {
              Id = Guid.NewGuid().ToString(),
              Type = "badElement",
              X = 1,
              Y = 2,
            },
            new ScanImportElement
            {
              Id = Guid.NewGuid().ToString(),
              Type = "chord",
              Value = "D",
              X = 50,
              Y = 50,
            },
          ],
        },
      ],
    };

    var result = _normalizer.Normalize(content);

    Assert.Single(result.Blocks[0].Elements);
    Assert.Equal("chord", result.Blocks[0].Elements[0].Type);
  }

  [Fact]
  public void Normalize_AddsFallbackBlock_WhenNoBlocksRemain()
  {
    var content = new ScanImportContent
    {
      Blocks =
      [
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "notARealType",
          Elements = [],
        },
      ],
    };

    var result = _normalizer.Normalize(content);

    Assert.Single(result.Blocks);
    Assert.Equal("lyrics", result.Blocks[0].Type);
    Assert.Equal(ScanImportSchema.FallbackLyricsText, result.Blocks[0].Text);
  }

  [Fact]
  public void Normalize_ClampsCoordinates()
  {
    var content = new ScanImportContent
    {
      Blocks =
      [
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "lyrics",
          Text = "",
          Elements =
          [
            new ScanImportElement
            {
              Id = Guid.NewGuid().ToString(),
              Type = "chord",
              X = -100,
              Y = 9999,
            },
          ],
        },
      ],
    };

    var result = _normalizer.Normalize(content);

    Assert.Equal(ScanImportSchema.MinX, result.Blocks[0].Elements[0].X);
    Assert.Equal(ScanImportSchema.MaxY, result.Blocks[0].Elements[0].Y);
  }
}
