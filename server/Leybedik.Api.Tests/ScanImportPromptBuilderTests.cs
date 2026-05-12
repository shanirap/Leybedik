using Leybedik.Api.Services.Imports;
using Xunit;

namespace Leybedik.Api.Tests;

public class ScanImportPromptBuilderTests
{
  [Fact]
  public void BuildTranscriptionPrompt_ContainsStrictTranscriptionRules()
  {
    var p = new ScanImportPromptBuilder().BuildTranscriptionPrompt();
    Assert.Contains("Return only valid JSON", p, StringComparison.Ordinal);
    Assert.Contains("transcription only", p, StringComparison.OrdinalIgnoreCase);
    Assert.Contains("do not fail the entire page", p, StringComparison.OrdinalIgnoreCase);
    Assert.Contains("If at least a few words are readable", p, StringComparison.Ordinal);
    Assert.Contains("[לא ברור]", p, StringComparison.Ordinal);
    Assert.Contains(
      "Set isReadable to false only if almost no meaningful text",
      p,
      StringComparison.Ordinal);
    Assert.Contains("Do not infer music content", p, StringComparison.Ordinal);
    Assert.Contains("Do not invent text", p, StringComparison.Ordinal);
    Assert.Contains("isReadable", p, StringComparison.Ordinal);
    Assert.Contains("recognizedText", p, StringComparison.Ordinal);
  }

  [Fact]
  public void BuildDocumentJsonPrompt_ContainsInputTextAndNoChordInventionRule()
  {
    const string recognizedText = "זה טקסט מזוהה";
    var p = new ScanImportPromptBuilder().BuildDocumentJsonPrompt(recognizedText);
    Assert.Contains(recognizedText, p, StringComparison.Ordinal);
    Assert.Contains("Do not invent chords", p, StringComparison.Ordinal);
  }
}
