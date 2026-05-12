interface EditorToolbarProps {
  onAddTitle: () => void;
  onAddTextBox: () => void;
  onAddSongLine: () => void;
  onAddTabBlock: () => void;
  onAddRepeatEnd: () => void;
  // onAddSharp: () => void;
  onAddArrow: () => void;
  onAddCircleNumber: () => void;
  onAddFraction: () => void;
  onAddVolta: () => void;
  onPrint: () => void;
  onAddPage: () => void;
  onAddGuitarSongLine: () => void;
}

export function EditorToolbar({
  onAddTitle,
  onAddTextBox,
  onAddSongLine,
  onAddTabBlock,
  onAddRepeatEnd,
  // onAddSharp,
  onAddArrow,
  onAddCircleNumber,
onAddFraction,
 onAddVolta,
 onPrint,
onAddPage,
onAddGuitarSongLine,
}: EditorToolbarProps) {
  return (
    <aside className="editor-toolbar" aria-label="כלי עריכה">
      <ToolbarSection title="כללי">
       <button type="button" className="toolbar-button"  onClick={onAddPage}>
  + עמוד
</button>
        <button type="button" className="toolbar-button" onClick={onAddTitle}>
          + כותרת
        </button>

        <button type="button" className="toolbar-button" onClick={onAddTextBox}>
          + תיבת טקסט
        </button>
        
        <button type="button" className="toolbar-button" onClick={onAddRepeatEnd}>
          + סגירת חזרה
        </button>

        <button type="button" className="toolbar-button" onClick={onAddArrow}>
  + חץ בין 2 מספרים
</button>

        <button type="button" className="toolbar-button" onClick={onAddFraction}>
  + שבר
</button>

        <button type="button" className="toolbar-button" onClick={onAddVolta}>
  + וולטה
</button>

        <button type="button" className="toolbar-button" onClick={onAddCircleNumber}>
  + עיגול סביב מספר
</button>
      </ToolbarSection>

      <ToolbarSection title="אורגן">
        <button type="button" className="toolbar-button" onClick={onAddSongLine}>
          + שורת שיר עם אקורדים
        </button>

      </ToolbarSection>

      <ToolbarSection title="גיטרה">
         <button type="button" onClick={onAddGuitarSongLine}>
    + שורת מילים עם אקורדים
  </button>

        <button type="button" className="toolbar-button" onClick={onAddTabBlock}>
          + טאבים
        </button>
      </ToolbarSection>

      <ToolbarSection title="תופים">
        <div className="toolbar-placeholder">בקרוב</div>
      </ToolbarSection>
       <button type="button" className="toolbar-button"  onClick={onPrint}>
  הדפסה / PDF
</button>
    </aside>
  );
}

function ToolbarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="toolbar-section">
      <h3 className="toolbar-section-title">{title}</h3>
      <div className="toolbar-section-content">{children}</div>
    </section>
  );
}