# Lamina — Anatomy Studio

A responsive study app for Anatomy & Physiology I, chapters 3–5.

**Live site:** https://rorrimaesu.github.io/anatomy-exam-studio/

## Study features

- 377 original practice items: 292 multiple choice, 30 true/false, 43 image questions, and 12 written responses.
- 20 course micrographs and a skin diagram with three verified letter targets.
- Guided practice, image practice, weak-area practice, and a 44-item mock exam.
- Questions selected without replacement; image subjects do not repeat within a regular round.
- Fresh option shuffles every round. For four-option items, the correct answer cannot occupy its previous presentation's slot. Correctness uses stable choice IDs, never letters.
- A mock exam has 30 MC, 3 micrograph identification, 3 skin identification, 6 T/F, and 2 written responses: 54 available points. Feedback waits until submission. The optional 60-minute timer submits automatically on expiry.
- Written responses use transparent three-criterion **self-assessment**. Pending written points are excluded from the displayed graded percentage until assessed. No unreliable keyword grading.
- Confidence ratings, topic accuracy, distinct-question coverage, repeated confident recall, weak-area queues, and recent scores.
- An editable mistake notebook, note export, and JSON progress backup/import.
- A saved unfinished round survives reload, preserving its choice order and exam deadline.
- Responsive layouts, keyboard answer shortcuts, focus styles, descriptive micrograph alternatives, and reduced-motion support.

## Ollama

Open Settings, choose **Connect & find models**, then select a model from your actual Ollama installation. The app uses `GET /api/tags` and streamed `POST /api/chat`. Cloud-only entries are excluded; a downloaded model must support text chat.

Ollama must run on the same computer as the browser. Only loopback endpoints are accepted; no hosted API key or remote model server is involved. On the hosted GitHub site, allow `https://rorrimaesu.github.io` with `OLLAMA_ORIGINS`, then quit and restart Ollama. The Windows helper in `setup/` adds that origin while retaining existing user-level entries. It asks before applying the setting and does not stop existing chats. Browsers may also request local-network permission. See the in-app Windows/macOS/Linux instructions and [Ollama's official FAQ](https://docs.ollama.com/faq).

The official Windows and macOS installers are one click away in Settings. The browser cannot silently run an installer or bypass operating-system approval. Linux installation links to the official instructions. The core practice app works fully without Ollama.

The tutor supplies relevant checked explanations as context. Responses are **AI-generated study assistance**, may be mistaken, and never overwrite the curated answer key. Personal notes are not automatically sent to the tutor.

## Run locally or validate

No build step or third-party JavaScript dependencies are required. Node 20+ is needed only for local serving/tests:

```sh
npm test
npm start
```

Then open http://127.0.0.1:4173. Open through a web server, rather than double-clicking `index.html`, so modules and the bank can load.

GitHub Pages publishes `main` from the repository root. All application paths are relative, so the project-page subpath works without rewriting.

## Learning records and limitations

Progress and notes use browser local storage. No account, analytics, or cloud synchronization. Export regularly; clearing site data or changing browsers loses the local copy. Backup import validates data and restores records/notes, without importing connection settings or an unfinished session. Chat is held only in page memory unless saved as a note. Google Fonts serves typography, with local fallbacks.

The question mix is original practice informed by the supplied first exam's formats. It cannot establish the teacher's exact future questions. Some related concepts appear in different task forms to test transfer. Four ambiguous, unkeyed tissue images are intentionally excluded from scored identification.

See [CREDITS.md](CREDITS.md) for course-source and image attribution. Source slides, handwritten pages, student exam scans, and personal file paths are not included in the public repository.
