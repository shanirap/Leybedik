import type {
  EditorElement,
  SongLineElement,
  SymbolElement,
  TabBlockElement,
  TextBoxElement,
} from "../types/editorDocument";

const FONT_OPTIONS = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "David", value: "David, serif" },
  { label: "Times New Roman", value: '"Times New Roman", serif' },
  { label: "Noto Sans Hebrew", value: '"Noto Sans Hebrew", Arial, sans-serif' },
  { label: "Rubik", value: "Rubik, Arial, sans-serif" },
  { label: "Heebo", value: "Heebo, Arial, sans-serif" },
  { label: "Frank Ruhl Libre", value: '"Frank Ruhl Libre", serif' },
  { label: "Courier New", value: '"Courier New", monospace' },
];

interface PropertiesPanelProps {
  selectedElement: EditorElement | null;
  onUpdateElement: (patch: Partial<EditorElement>) => void;
  onUpdateElementData: <T extends EditorElement>(
    updater: (element: T) => T
  ) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
}

export function PropertiesPanel({
  selectedElement,
  onUpdateElement,
  onUpdateElementData,
  onDelete,
  onDuplicate,
  onBringToFront,
}: PropertiesPanelProps) {
  return (
    <aside className="properties-panel" aria-label="מאפייני אלמנט">
      <h2 className="properties-title">מאפיינים</h2>

      {!selectedElement ? (
        <div className="properties-empty">
          בחרי אלמנט בדף כדי לערוך מאפיינים.
        </div>
      ) : (
        <>
          <ElementFrameControls
            element={selectedElement}
            onUpdateElement={onUpdateElement}
          />

          {selectedElement.type === "textBox" ? (
            <TextBoxProperties
              element={selectedElement}
              onUpdateElementData={onUpdateElementData}
            />
          ) : null}

          {selectedElement.type === "songLine" ? (
            <SongLineProperties
              element={selectedElement}
              onUpdateElementData={onUpdateElementData}
            />
          ) : null}

          {selectedElement.type === "tabBlock" ? (
            <TabBlockProperties
              element={selectedElement}
              onUpdateElementData={onUpdateElementData}
            />
          ) : null}

          {selectedElement.type === "symbol" ? (
            <SymbolProperties
              element={selectedElement}
              onUpdateElementData={onUpdateElementData}
            />
          ) : null}

          <div className="properties-actions">
            <button type="button" onClick={onBringToFront}>
              הבא קדימה
            </button>

            <button type="button" onClick={onDuplicate}>
              שכפל
            </button>

            <button type="button" className="danger" onClick={onDelete}>
              מחק
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

function ElementFrameControls({
  element,
  onUpdateElement,
}: {
  element: EditorElement;
  onUpdateElement: (patch: Partial<EditorElement>) => void;
}) {
  return (
    <section className="properties-section">
      <h3>מיקום וגודל</h3>

      <NumberField
        label="X"
        value={element.x}
        onChange={(value) => onUpdateElement({ x: value } as Partial<EditorElement>)}
      />

      <NumberField
        label="Y"
        value={element.y}
        onChange={(value) => onUpdateElement({ y: value } as Partial<EditorElement>)}
      />

      <NumberField
        label="רוחב"
        value={element.width}
        onChange={(value) =>
          onUpdateElement({ width: value } as Partial<EditorElement>)
        }
      />

      {element.type !== "songLine" ? (
        <NumberField
          label="גובה"
          value={element.height}
          onChange={(value) =>
            onUpdateElement({ height: value } as Partial<EditorElement>)
          }
        />
      ) : (
        <div className="properties-note">
          גובה שורת שיר קבוע כדי לשמור על מבנה נקי.
        </div>
      )}
    </section>
  );
}

function TextBoxProperties({
  element,
  onUpdateElementData,
}: {
  element: TextBoxElement;
  onUpdateElementData: <T extends EditorElement>(
    updater: (element: T) => T
  ) => void;
}) {
  const data = element.data;

  return (
    <section className="properties-section">
      <h3>{data.role === "title" ? "כותרת" : "תיבת טקסט"}</h3>

      <NumberField
        label="גודל טקסט"
        value={data.fontSize}
        onChange={(value) =>
          onUpdateElementData<TextBoxElement>((current) => ({
            ...current,
            data: { ...current.data, fontSize: value },
          }))
        }
      />
      <SelectField
        label="פונט"
        value={data.fontFamily}
        options={FONT_OPTIONS}
        onChange={(value) =>
          onUpdateElementData<TextBoxElement>((current) => ({
            ...current,
            data: {
              ...current.data,
              fontFamily: value,
            },
          }))
        }
      />
      <TextField
        label="צבע"
        value={data.color}
        onChange={(value) =>
          onUpdateElementData<TextBoxElement>((current) => ({
            ...current,
            data: { ...current.data, color: value },
          }))
        }
      />

      <SelectField
        label="יישור"
        value={data.textAlign}
        options={[
          { value: "right", label: "ימין" },
          { value: "center", label: "מרכז" },
          { value: "left", label: "שמאל" },
        ]}
        onChange={(value) =>
          onUpdateElementData<TextBoxElement>((current) => ({
            ...current,
            data: {
              ...current.data,
              textAlign: value as TextBoxElement["data"]["textAlign"],
            },
          }))
        }
      />

      <SelectField
        label="כיוון"
        value={data.direction}
        options={[
          { value: "rtl", label: "ימין לשמאל" },
          { value: "ltr", label: "שמאל לימין" },
        ]}
        onChange={(value) =>
          onUpdateElementData<TextBoxElement>((current) => ({
            ...current,
            data: {
              ...current.data,
              direction: value as TextBoxElement["data"]["direction"],
            },
          }))
        }
      />

      <CheckField
        label="מודגש"
        checked={data.bold}
        onChange={(checked) =>
          onUpdateElementData<TextBoxElement>((current) => ({
            ...current,
            data: { ...current.data, bold: checked },
          }))
        }
      />

      <CheckField
        label="נטוי"
        checked={data.italic}
        onChange={(checked) =>
          onUpdateElementData<TextBoxElement>((current) => ({
            ...current,
            data: { ...current.data, italic: checked },
          }))
        }
      />

      <CheckField
        label="קו תחתון"
        checked={data.underline}
        onChange={(checked) =>
          onUpdateElementData<TextBoxElement>((current) => ({
            ...current,
            data: { ...current.data, underline: checked },
          }))
        }
      />
    </section>
  );
}

function SongLineProperties({
  element,
  onUpdateElementData,
}: {
  element: SongLineElement;
  onUpdateElementData: <T extends EditorElement>(
    updater: (element: T) => T
  ) => void;
}) {
  const data = element.data;

  return (
    <section className="properties-section">
      <h3>שורת שיר</h3>

      <NumberField
        label="גודל שורת מילים"
        value={data.lyricsFontSize}
        onChange={(value) =>
          onUpdateElementData<SongLineElement>((current) => ({
            ...current,
            data: { ...current.data, lyricsFontSize: value },
          }))
        }
      />
<SelectField
  label="פונט מילים"
  value={data.lyricsFontFamily}
  options={FONT_OPTIONS}
  onChange={(value) =>
    onUpdateElementData<SongLineElement>((current) => ({
      ...current,
      data: {
        ...current.data,
        lyricsFontFamily: value,
      },
    }))
  }
/>
      <NumberField
        label="גודל אקורדים"
        value={data.chordFontSize}
        onChange={(value) =>
          onUpdateElementData<SongLineElement>((current) => ({
            ...current,
            data: { ...current.data, chordFontSize: value },
          }))
        }
      />
<SelectField
  label="פונט אקורדים"
  value={data.chordFontFamily ?? data.lyricsFontFamily}
  options={FONT_OPTIONS}
  onChange={(value) =>
    onUpdateElementData<SongLineElement>((current) => ({
      ...current,
      data: {
        ...current.data,
        chordFontFamily: value,
      },
    }))
  }
/>
      <TextField
        label="צבע מילים"
        value={data.lyricsColor}
        onChange={(value) =>
          onUpdateElementData<SongLineElement>((current) => ({
            ...current,
            data: { ...current.data, lyricsColor: value },
          }))
        }
      />

      <TextField
        label="צבע אקורדים"
        value={data.chordColor}
        onChange={(value) =>
          onUpdateElementData<SongLineElement>((current) => ({
            ...current,
            data: { ...current.data, chordColor: value },
          }))
        }
      />

      <SelectField
        label="יישור"
        value={data.lyricsAlign}
        options={[
          { value: "left", label: "שמאל" },
          { value: "center", label: "מרכז" },
          { value: "right", label: "ימין" },
        ]}
        onChange={(value) =>
          onUpdateElementData<SongLineElement>((current) => ({
            ...current,
            data: {
              ...current.data,
              lyricsAlign: value as SongLineElement["data"]["lyricsAlign"],
            },
          }))
        }
      />

      <SelectField
        label="כיוון"
        value={data.direction}
        options={[
          { value: "ltr", label: "שמאל לימין" },
          { value: "rtl", label: "ימין לשמאל" },
        ]}
        onChange={(value) =>
          onUpdateElementData<SongLineElement>((current) => ({
            ...current,
            data: {
              ...current.data,
              direction: value as SongLineElement["data"]["direction"],
            },
          }))
        }
      />

      <CheckField
        label="מילים מודגשות"
        checked={data.lyricsBold}
        onChange={(checked) =>
          onUpdateElementData<SongLineElement>((current) => ({
            ...current,
            data: { ...current.data, lyricsBold: checked },
          }))
        }
      />

      <div className="properties-note">
        אקורדים וסימונים קטנים נערכים ישירות בתוך השורה.
      </div>
    </section>
  );
}

function TabBlockProperties({
  element,
  onUpdateElementData,
}: {
  element: TabBlockElement;
  onUpdateElementData: <T extends EditorElement>(
    updater: (element: T) => T
  ) => void;
}) {
  const data = element.data;

  return (
    <section className="properties-section">
      <h3>טאבים</h3>

      <NumberField
        label="מספר שורות"
        value={data.strings}
        min={1}
        max={12}
        onChange={(value) =>
          onUpdateElementData<TabBlockElement>((current) => ({
            ...current,
            data: {
              ...current.data,
              strings: Math.max(1, Math.min(12, Math.round(value))),
            },
          }))
        }
      />

      <NumberField
        label="ריווח שורות"
        value={data.lineSpacing}
        min={10}
        max={40}
        onChange={(value) =>
          onUpdateElementData<TabBlockElement>((current) => ({
            ...current,
            data: { ...current.data, lineSpacing: value },
          }))
        }
      />

      <NumberField
        label="גודל מספרים"
        value={data.fontSize}
        min={8}
        max={48}
        onChange={(value) =>
          onUpdateElementData<TabBlockElement>((current) => ({
            ...current,
            data: { ...current.data, fontSize: value },
          }))
        }
      />

      <div className="properties-note">
        מספרים בטאב נערכים וזזים ישירות בתוך הטאב.
      </div>
    </section>
  );
}

function SymbolProperties({
  element,
  onUpdateElementData,
}: {
  element: SymbolElement;
  onUpdateElementData: <T extends EditorElement>(
    updater: (element: T) => T
  ) => void;
}) {
  const data = element.data;

  return (
    <section className="properties-section">
      <h3>סימון</h3>

      <div className="properties-note">סוג סימון: {data.symbolType}</div>

      {data.symbolType === "volta" || data.symbolType === "circleNumber" ? (
        <TextField
          label="ערך"
          value={data.value ?? ""}
          onChange={(value) =>
            onUpdateElementData<SymbolElement>((current) => ({
              ...current,
              data: { ...current.data, value },
            }))
          }
        />
      ) : null}

      {data.symbolType === "fraction" ? (
        <>
          <TextField
            label="מונה"
            value={data.numerator ?? ""}
            onChange={(value) =>
              onUpdateElementData<SymbolElement>((current) => ({
                ...current,
                data: { ...current.data, numerator: value },
              }))
            }
          />

          <TextField
            label="מכנה"
            value={data.denominator ?? ""}
            onChange={(value) =>
              onUpdateElementData<SymbolElement>((current) => ({
                ...current,
                data: { ...current.data, denominator: value },
              }))
            }
          />
        </>
      ) : null}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="property-field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isFinite(nextValue)) {
            onChange(nextValue);
          }
        }}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="property-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="property-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="property-field checkbox-field">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}