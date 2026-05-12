using Leybedik.Api.Dtos.Imports;
using Leybedik.Api.Services.Imports;
using Xunit;

namespace Leybedik.Api.Tests;

public class ScanImportContentValidatorTests
{
  private readonly ScanImportContentValidator _validator = new();

  [Fact]
  public void Validate_AcceptsNormalizedMockLikeContent()
  {
    var content = new ScanImportContent
    {
      Version = ScanImportSchema.ExpectedVersion,
      Blocks =
      [
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "lyrics",
          Text = "hello",
          Elements =
          [
            new ScanImportElement
            {
              Id = Guid.NewGuid().ToString(),
              Type = "chord",
              Value = "Am",
              X = 80,
              Y = 8,
            },
          ],
        },
      ],
    };

    var messages = _validator.Validate(content);

    Assert.Empty(messages);
  }

  [Fact]
  public void Validate_NullContent_ReturnsErrors()
  {
    var messages = _validator.Validate(null);

    Assert.NotEmpty(messages);
  }

  [Fact]
  public void Validate_WrongVersion_Reported()
  {
    var content = new ScanImportContent
    {
      Version = 99,
      Blocks =
      [
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "lyrics",
          Text = "",
          Elements = [],
        },
      ],
    };

    var messages = _validator.Validate(content);

    Assert.Contains(messages, m => m.Contains("version", StringComparison.OrdinalIgnoreCase));
  }

  [Fact]
  public void Validate_InvalidBlockTypeBeforeNormalization_Reported()
  {
    var content = new ScanImportContent
    {
      Version = 1,
      Blocks =
      [
        new ScanImportBlock
        {
          Id = Guid.NewGuid().ToString(),
          Type = "customText",
          Text = "",
          Elements = [],
        },
      ],
    };

    var messages = _validator.Validate(content);

    Assert.Contains(messages, m => m.Contains("invalid type", StringComparison.OrdinalIgnoreCase));
  }

  [Fact]
  public void Validate_XYOutOfRange_Reported()
  {
    var content = new ScanImportContent
    {
      Version = 1,
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
              X = 99999,
              Y = -5,
            },
          ],
        },
      ],
    };

    var messages = _validator.Validate(content);

    Assert.Contains(messages, m => m.Contains("coordinates", StringComparison.OrdinalIgnoreCase));
  }
}
