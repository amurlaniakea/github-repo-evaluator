# github-repo-evaluator

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.txt)

**GitHub Repository Evaluator** — A React/TypeScript application for evaluating GitHub repositories.

## Features

- **Repository Analysis**: Evaluate GitHub repos with dependency scoring, issue tracking, and quality metrics
- **PDF Report Generation**: Generate detailed PDF reports with score gauges and dependency cards
- **Modern Stack**: React 19 + TypeScript + Vite + TailwindCSS 4 + Express backend
- **AI Integration**: Uses Google GenAI for intelligent repository analysis

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local` (copy from `.env.example`)

3. Run the app:
   ```bash
   npm run dev
   ```

## License

AGPL-3.0-or-later — Copyright (C) 2026 Pedro Sordo Martínez — amurlaniakea@gmail.com

See [LICENSE](LICENSE) for the full license text.
   `npm run dev`
