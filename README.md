# Matrix Figures Canvas Prototype

Prototipo em Web Canvas com:
- grid procedural estilo Matrix (pseudo-caracteres vetoriais, sem fonte padrao);
- morph para 6 cenas abstratas animadas:
  Golden Spiral, Orbit Weave, Fractal Tree, Rose Lattice, Knot Field, Hex Mandala;
- relevo visual com nucleo claro + halo em degrade;
- transicao automatica entre cenas;
- controles de speed, brightness e density;
- botao de pause/resume e lock/unlock da cena;
- presets visuais: performance e quality.

## Executar localmente

No diretorio do projeto:

```bash
python3 -m http.server 8765
```

Abra no navegador:

`http://localhost:8765`

## Controles

- `Speed`: acelera ou desacelera a animacao/morph.
- `Brightness`: aumenta/reduz nucleo claro e glow.
- `Density`: controla densidade de glyphs desenhados.
- `Pause/Resume`: pausa ou retoma a timeline.
- `Lock/Unlock Scene`: fixa a cena atual ou volta ao ciclo automatico.
- `Performance`: preset com menos custo de render.
- `Quality`: preset com maior detalhe visual.

## Arquivos

- `index.html`: estrutura da pagina e canvas.
- `styles.css`: tema visual + HUD.
- `main.js`: motor de animacao (grid procedural, silhuetas e morph).
