/** Carrega o <model-viewer> (Apache-2.0, servido do próprio site) só quando um modelo 3D aparece. */
let scriptMv: Promise<void> | null = null;
export function carregarModelViewer() {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("model-viewer")) return Promise.resolve();
  scriptMv ??= new Promise<void>((ok, erro) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = "/vendor/model-viewer/model-viewer.min.js";
    s.onload = () => ok();
    s.onerror = () => {
      scriptMv = null;
      erro(new Error("model-viewer"));
    };
    document.head.appendChild(s);
  });
  return scriptMv;
}
