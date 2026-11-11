# Modelo de profundidade

- **Modelo:** Depth Anything V2 Small, conversão ONNX de `onnx-community/depth-anything-v2-small` (Hugging Face).
- **Licença:** Apache-2.0.
- **Variante:** `onnx/model_bnb4.onnx`, salva aqui como `model.onnx` (26.077.648 bytes = 24,87 MiB).
- **Entrada:** `pixel_values` float32 `[1, 3, H, W]` (usamos 518×518). **Saída:** `predicted_depth` float32 `[1, H, W]`.

## Por que esta variante

Nenhuma variante float32 "comum" cabe abaixo de 25 MiB (limite de arquivo do Cloudflare Pages):

| Variante | Tamanho | ort-web 1.20.1 (WASM, 1 thread, Mac Intel) | Correlação com q4 (pastel / cartola) |
|---|---|---|---|
| model_q4 | 27,4 MB | ok, ~22 s | 1,000 |
| model_quantized (int8) | 27,3 MB | ok, ~10 s | 0,9987 / 0,9989 |
| **model_bnb4** | **26,1 MB (24,87 MiB)** | **ok, ~16 s** | **0,9934 / 0,9990** |
| model_q4f16 | 19,1 MB | ok, ~24 s | 1,000 |

Tempos incluem criação da sessão e a primeira inferência. `q4f16` foi evitada por usar pesos fp16 internamente
(mais lenta no WASM). Se o limite de 25 MiB deixar de existir, `model_quantized` é a mais rápida.
