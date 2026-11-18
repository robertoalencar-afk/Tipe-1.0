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
        "shadow-softness"?: string;
        "field-of-view"?: string;
        "environment-image"?: string;
        exposure?: string;
        "camera-orbit"?: string;
        "max-camera-orbit"?: string;
        "interaction-prompt"?: string;
      };
    }
  }
}
