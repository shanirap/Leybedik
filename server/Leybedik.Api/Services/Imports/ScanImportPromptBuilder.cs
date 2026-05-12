namespace Leybedik.Api.Services.Imports;

public class ScanImportPromptBuilder
{
  public string BuildTranscriptionPrompt()
  {
    return """
Return only valid JSON.
Do not wrap the answer in markdown.
Do not add explanations.

You are doing transcription only.
Your only task is to transcribe visible text from the uploaded image.

Important rules:
- Do not infer music content.
- Do not add chords, tabs, or musical explanations.
- Do not guess missing words.
- Do not invent text.
- But do not fail the entire page just because some handwriting is unclear.
- If at least a few words are readable, set isReadable to true.
- Transcribe only the readable words and lines.
- Use "[לא ברור]" for unclear words or short unclear segments.
- If an entire line is unreadable, skip it or write "[שורה לא ברורה]".
- Preserve approximate line breaks.
- Preserve Hebrew wording and direction as much as possible.
- Set isReadable to false only if almost no meaningful text can be read from the image.
- Never replace unreadable handwriting with generic content.
- Never summarize.
- Never explain.
- Never translate.
- Only include text that is clearly visible in the image.
- Return only the JSON object.

Return exactly this JSON schema:
{
  "isReadable": true,
  "recognizedText": "string",
  "warnings": ["string"]
}

Example:
If the image contains three readable Hebrew words and the rest is unclear:
{
  "isReadable": true,
  "recognizedText": "מילה ברורה [לא ברור] עוד מילה",
  "warnings": ["חלק מהטקסט לא היה ברור"]
}

If almost nothing is readable:
{
  "isReadable": false,
  "recognizedText": "",
  "warnings": ["לא זוהה טקסט ברור בתמונה"]
}

Return only the JSON object.
""";
  }

  public string BuildDocumentJsonPrompt(string recognizedText)
  {
    var text = recognizedText?.Trim() ?? string.Empty;
    return $$"""
Return only valid JSON.
Do not wrap the answer in markdown.
Do not add explanations.

You are converting transcribed page text into a structured editable document.
Use only the provided recognized text. Do not add missing content.

Recognized text:
{{text}}

The output must match this JSON schema exactly:
{
  "version": 1,
  "blocks": [
    {
      "id": "string",
      "type": "lyrics| chords  | tabs | personal | explain | chordDiagram",
      "title": "optional string",
      "chordName": "optional string",
      "text": "string",
      "elements": [
        {
          "id": "string",
          "type": "chord | tabNote | volta | repeatStart | repeatEnd | breath | dynamic | chordDot",
          "value": "optional string",
          "x": 0,
          "y": 0
        }
      ]
    }
  ]
}

Rules:
- Use version 1.
- Generate stable ids as simple strings like block-1, element-1.
- Prefer lyrics or explain blocks with the recognized text.
- Do not invent text.
- Do not invent chords.
- Do not add chords if they are not explicitly present in the recognized text.
- If explicit chord symbols like Am, C, G, Dm, F, E are not present, do not create chord elements.
- If explicit tablature notation is not present, do not create tabs blocks or tabNote elements.
- Do not infer guitar tabs from context.
- Preserve Hebrew wording and line breaks as much as possible.
- x must be between 0 and 650.
- y must be between 0 and 500.
- Do not add top-level fields that are not in the schema.

Return JSON only.
""";
  }
}
