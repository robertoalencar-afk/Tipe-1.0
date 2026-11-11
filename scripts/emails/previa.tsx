// Gera prévias HTML dos e-mails do site: bun scripts/emails/previa.tsx <pasta>
import * as React from "react";
import { render } from "@react-email/render";
import { mkdirSync, writeFileSync } from "node:fs";
import { TEMPLATES } from "../../src/lib/email-templates/registry";
const out = process.argv[2] ?? "previa-emails";
mkdirSync(out, { recursive: true });
for (const [nome, t] of Object.entries(TEMPLATES)) {
  writeFileSync(`${out}/${nome}.html`, await render(React.createElement(t.component, t.previewData ?? {})));
}
console.log("ok", Object.keys(TEMPLATES).length);
