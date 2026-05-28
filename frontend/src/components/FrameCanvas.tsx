import type { FrameTemplate } from "../lib/frameTemplates";

type Props = {
  template: FrameTemplate;
};

const toneByKind = {
  VERIFY: "verify",
  EXECUTION: "execution",
  APPROVE: "approve"
};

export function FrameCanvas({ template }: Props) {
  return (
    <section className="canvas" aria-label="Frame flow">
      {template.steps.map((step, index) => (
        <article className={`frame-node ${toneByKind[step.kind]}`} key={`${step.kind}-${step.title}`}>
          <div className="node-index">{index + 1}</div>
          <div>
            <p className="node-kind">{step.kind}</p>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
