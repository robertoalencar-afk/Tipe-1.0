// <model-viewer> (Apache-2.0), servido de /vendor/model-viewer e carregado sob demanda.
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        poster?: string;
        ar?: string;
        "ar-modes"?: string;
        "camera-controls"?: string;
        "auto-rotate"?: string;
        "shadow-intensity"?: string;
        exposure?: string;
        "camera-orbit"?: string;
        "interaction-prompt"?: string;
      };
    }
  }
}
