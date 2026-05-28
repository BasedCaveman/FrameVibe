import type { FrameTemplate } from "../lib/frameTemplates";
import { templates } from "../lib/frameTemplates";

type Props = {
  selectedId: string;
  onSelect: (template: FrameTemplate) => void;
};

export function TemplateGallery({ selectedId, onSelect }: Props) {
  return (
    <aside className="gallery" aria-label="Template gallery">
      {templates.map((template) => (
        <button
          type="button"
          className={`template ${selectedId === template.id ? "selected" : ""}`}
          key={template.id}
          onClick={() => onSelect(template)}
        >
          <span>{template.name}</span>
          <small>{template.chainFit}</small>
        </button>
      ))}
    </aside>
  );
}
