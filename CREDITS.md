# Sources and image credits

The bank contains original practice questions based on the supplied A&P chapter materials, worksheets, handwritten study priorities, and prior exam formats. It does not reproduce the instructor's prior exam or predict the next exam's exact items. Each question links to its relevant textbook section.

Textbook reference: **OpenStax, Anatomy and Physiology 2e**, © 2026 Rice University, as stated on the supplied course PDF's copyright page; original publication 2022. [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). [Book](https://openstax.org/details/books/anatomy-and-physiology-2e). **Access for free at openstax.org.** An earlier app credit incorrectly named CC BY 4.0; this update follows the actual supplied PDF's noncommercial/share-alike license.

## Textbook evidence for tutoring

`data/textbook.json` contains 224 selected, normalized excerpts across all 16 assigned sections: printed pages 86–119, 130–158, and 167–189 of the supplied PDF (PDF page = printed page + 16). These are instructional excerpts, not a complete digital copy of the chapters. Running headers, navigation, most exercises, and a dated cystic-fibrosis prognosis paragraph are omitted. Line breaks and spacing are normalized. Some excerpts cross a paragraph or figure caption and may begin mid-sentence at a page boundary.

Each excerpt retains its section, printed/PDF page, online section URL, and stable ID (`T3-108-02`, for example). The source viewer labels editorial clarifications, shows the original extracted wording when changed, and links supporting references. Corrected teaching text, rather than a known printing error, is passed to the tutor. The interface recognizes only source IDs actually supplied with that response; a linked citation does not independently establish that the model's claim is correct. No model training or remote AI service is involved.

The corpus and educational adaptations are provided under CC BY-NC-SA 4.0; see [LICENSE-EDUCATIONAL-CONTENT.md](LICENSE-EDUCATIONAL-CONTENT.md).

## Visual material

- `assets/tissues/specimen-01.webp` through `specimen-20.webp`: format-converted, proportionally resized microscopy images extracted from the user-supplied **BI 231 Tissue Slides**, a six-slide numbered course deck. The deck's embedded images have no embedded textual author key. Original image rights remain with their respective creators; no new license is asserted over the source micrographs. Each question identifies the slide and embedded-image position. Uncertain images are not used as scored identity questions.
- `assets/skin.png`: adapted crop of **OpenStax Anatomy and Physiology 2e, Figure 5.2**, supplied course textbook. Original labels removed in the study material; A/B/C target markers are overlaid in the web app. A points to sebaceous gland, B to arrector pili muscle, C to Pacinian corpuscle. OpenStax/Rice University, CC BY-NC-SA 4.0.
- Decorative home-page microscopy uses one of the same study specimens with a color treatment; it is not a separate diagnostic image.
- Interface icon paths and favicon are original simple vector artwork.
- Fonts: DM Sans and Instrument Serif via Google Fonts, with system fallbacks.

## Corrections retained from the study audit

- Pre-mRNA, not DNA, is spliced.
- Template DNA complements RNA; coding DNA matches RNA except T/U.
- The p.108 template/coding error is labeled with [NHGRI's antisense definition](https://www.genome.gov/genetics-glossary/antisense); pre-mRNA splicing and alternative exon combinations are clarified on pp.108–109.
- CFTR is an ATP-gated chloride channel, not an ATP-powered chloride pump. Gating uses ATP; chloride flow is passive. The supplied p.95 wording is labeled with [Hwang & Kirk's CFTR review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3530039/).
- The p.95 claim that all cells have nuclei is qualified: mature human red blood cells lack nuclei.
- RNA uses ribose and uracil. DNA pairs A–T (2 hydrogen bonds) and G–C (3).
- Stop codons recruit a release factor, not a stop amino-acid tRNA.
- Cytokinesis uses actin/myosin, not intermediate filaments.
- The worksheet's 30S/50S translation model is explicitly **bacterial**.
- Tendon is dense regular connective tissue; reticular dermis is dense irregular.
- Mesenchymal stem cells differ from matrix-producing fibroblasts and matrix-maintaining fibrocytes.
- Adults retain red marrow; yellow marrow is rich in fat.
- Generic apocrine secretion-mode diagrams and the named apocrine sweat-gland category are distinguished.
- Tissue recognition uses structure and context, not stain color alone.

## Integration references

- [Ollama model list](https://docs.ollama.com/api/tags)
- [Ollama chat API](https://docs.ollama.com/api/chat)
- [Ollama model thinking controls](https://docs.ollama.com/capabilities/thinking)
- [Ollama environment/origin setup](https://docs.ollama.com/faq)
- [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
