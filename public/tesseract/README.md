# Ressources Tesseract.js (OCR local)

Ces fichiers permettent à l'OCR de fonctionner entièrement sur l'appareil,
sans télécharger quoi que ce soit d'un CDN à l'exécution (local-first / Loi 25).

- `worker.min.js` — worker Tesseract.js (copié de node_modules/tesseract.js/dist/)
- `tesseract-core-simd-lstm.wasm(.js)` — moteur WASM (copié de node_modules/tesseract.js-core/)
- `tesseract-core-lstm.wasm(.js)` — variante sans SIMD (repli)
- `fra.traineddata.gz` — données de langue française (depuis github.com/tesseract-ocr/tessdata)

Si Tesseract.js est mis à jour, recopier worker et core depuis node_modules.
Les chemins sont configurés dans src/lib/ocr/index.ts.
