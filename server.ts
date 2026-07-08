import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI SDK with server-side environment variable
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to sanitize GitHub URLs
function parseGithubUrl(urlStr: string) {
  try {
    const cleaned = urlStr.trim().replace(/\/$/, "");
    const parts = cleaned.split("/");
    // Normal format: https://github.com/owner/repo
    const githubIndex = parts.findIndex(p => p.includes("github.com"));
    if (githubIndex !== -1 && parts[githubIndex + 1] && parts[githubIndex + 2]) {
      return {
        owner: parts[githubIndex + 1],
        repo: parts[githubIndex + 2]
      };
    }
    // Simple format: owner/repo
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1] };
    }
    // Fallback if just the repo name is given
    if (parts.length === 1 && parts[0]) {
      return { owner: "amurlaniakea", repo: parts[0] };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// In-depth analysis mock fallback for amurlaniakea/hermes-crew-hybrid
// in case of API rate limits, private status, or missing tokens.


// Main Analysis Endpoint
app.post("/api/analyze", async (req, res) => {
  const { repoUrl, githubToken } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "El URL del repositorio es obligatorio" });
  }

  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    return res.status(400).json({ error: "Formato de URL de GitHub no válido. Use 'usuario/repo' o el enlace completo." });
  }

  const { owner, repo } = parsed;
  

  try {
    // Attempt real fetch from GitHub API
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Repo-Evaluator-App"
    };

    if (githubToken) {
      headers["Authorization"] = `token ${githubToken}`;
    } else if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // 1. Get repository base details
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    
    if (!repoRes.ok) {
      // If unauthorized or rate limited, or private repo, and it's our target, return mock
      
      throw new Error(`Error de la API de GitHub: ${repoRes.statusText} (${repoRes.status})`);
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || "main";

    // 2. Fetch repo tree (recursive)
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
    let treeFiles: string[] = [];
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      treeFiles = (treeData.tree || [])
        .filter((item: any) => item.type === "blob")
        .map((item: any) => item.path);
    }

    // 3. Fetch contents of crucial files to provide context to Gemini
    const crucialFiles = [
      "package.json",
      "requirements.txt",
      "pyproject.toml",
      "README.md",
      "tsconfig.json",
      "vite.config.ts"
    ];

    // Identify some main source files
    const sourceFiles = treeFiles.filter(path => {
      // Look for files in src/, agents/, or root scripts
      const lower = path.toLowerCase();
      const isKeyDir = lower.startsWith("src/") || lower.startsWith("agents/") || lower.startsWith("lib/") || lower.startsWith("app/");
      const isKeyExt = lower.endsWith(".py") || lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".js");
      const isTest = lower.includes("test") || lower.includes("spec");
      return isKeyDir && isKeyExt && !isTest && !lower.includes("node_modules") && !lower.includes("dist");
    }).slice(0, 5); // take max 5 source files

    // Identify test files
    const testFiles = treeFiles.filter(path => {
      const lower = path.toLowerCase();
      return (lower.includes("test") || lower.includes("spec")) && (lower.endsWith(".py") || lower.endsWith(".ts") || lower.endsWith(".js"));
    }).slice(0, 3); // take max 3 test files

    const filesToFetch = [...crucialFiles.filter(f => treeFiles.includes(f)), ...sourceFiles, ...testFiles];
    const fileContents: Record<string, string> = {};

    // Parallel fetch contents of key files from raw user content to preserve API tokens
    await Promise.all(
      filesToFetch.map(async (filePath) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filePath}`;
          const rawRes = await fetch(rawUrl, { headers });
          if (rawRes.ok) {
            const text = await rawRes.text();
            // Truncate file content to max 4000 chars to avoid token blow up
            fileContents[filePath] = text.slice(0, 4000) + (text.length > 4000 ? "\n... [TRUNCATED] ..." : "");
          }
        } catch (e) {
          console.error(`Failed to fetch file: ${filePath}`, e);
        }
      })
    );

    // If we fetched files but got no contents, or if we have very little context,
    // and it is hermes-crew-hybrid, we merge mock data or fallback to mock
    

    // 4. Construct Gemini prompt
    const prompt = `
Eres un Ingeniero de Software Principal y Auditor de Código de IA experto.
Tu tarea es realizar un análisis exhaustivo del siguiente repositorio de GitHub, evaluar su estructura, dependencias, legibilidad, pruebas unitarias y posibles fallos, y proporcionar una evaluación técnica altamente constructiva y precisa en español.

INFORMACIÓN DEL REPOSITORIO:
- Nombre: ${repoData.name}
- Propietario: ${owner}
- Descripción: ${repoData.description || "Sin descripción."}
- Estrellas: ${repoData.stargazers_count}
- Bifurcaciones (Forks): ${repoData.forks_count}
- Lenguaje principal: ${repoData.language || "No especificado"}

ARCHIVOS ENCONTRADOS EN EL ÁRBOL:
${treeFiles.slice(0, 100).map(f => `- ${f}`).join("\n")}${treeFiles.length > 100 ? `\n... y ${treeFiles.length - 100} archivos más.` : ""}

CONTENIDO DE LOS ARCHIVOS CLAVE (Muestra o extracto):
${Object.entries(fileContents).map(([path, content]) => `
=== ARCHIVO: ${path} ===
${content}
`).join("\n")}

Por favor, analiza estos datos con detalle y devuelve un informe estructurado en formato JSON EXACTO. 
Debes respetar el siguiente esquema JSON para que pueda ser parseado perfectamente en el frontend. No incluyas explicaciones en texto plano antes o después del bloque JSON.

EVALÚA LOS SIGUIENTES ASPECTOS:
1. Puntuación general y puntuaciones individuales (de 0 a 100).
2. Resumen del proyecto en un párrafo descriptivo en español.
3. Evaluación detallada de dependencias (estado: 'excellent', 'good', 'warning' o 'critical', un párrafo descriptivo, y una lista de dependencias críticas encontradas con su estado y recomendación).
4. Evaluación detallada de legibilidad (estado, párrafo descriptivo y una lista de 3 a 5 puntos destacados o críticas positivas).
5. Evaluación detallada de pruebas unitarias/tests (estado, párrafo descriptivo y estimación de cobertura).
6. Lista de problemas encontrados (issues) clasificados por severidad ('high', 'medium', 'low'). Para cada problema proporciona: título, descripción, archivo afectado, y la propuesta de corrección detallada (código o pasos a seguir).

ESQUEMA JSON REQUERIDO:
{
  "repoName": "${repoData.name}",
  "owner": "${owner}",
  "description": "${repoData.description || ""}",
  "stars": ${repoData.stargazers_count},
  "forks": ${repoData.forks_count},
  "language": "${repoData.language || ""}",
  "tree": ${JSON.stringify(treeFiles.slice(0, 50))},
  "scores": {
    "overall": 85,
    "dependencies": 80,
    "legibility": 90,
    "tests": 60,
    "reliability": 85
  },
  "analysis": {
    "summary": "Texto resumen aquí...",
    "dependencies": {
      "status": "warning",
      "details": "Detalles de las dependencias...",
      "items": [
        { "name": "nombre_libreria", "version": "v1.2.3", "status": "warning", "recommendation": "Actualizar a..." }
      ]
    },
    "legibility": {
      "status": "excellent",
      "details": "Detalles de la legibilidad...",
      "highlights": [
        "Punto fuerte 1",
        "Punto fuerte 2"
      ]
    },
    "tests": {
      "status": "warning",
      "details": "Detalles de las pruebas...",
      "coverageEst": "40% - Comentario de cobertura"
    },
    "issues": [
      {
        "severity": "high",
        "title": "Título del problema",
        "description": "Explicación clara del problema...",
        "file": "nombre_archivo.py",
        "fix": "Código de corrección o pasos"
      }
    ]
  }
}
`;

    // 5. Call Gemini
    const geminiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const textResponse = geminiRes.text;
    if (!textResponse) {
      throw new Error("No se pudo obtener una respuesta del modelo de análisis.");
    }

    const cleanJson = textResponse.trim();
    const parsedAnalysis = JSON.parse(cleanJson);
    return res.json(parsedAnalysis);

  } catch (error: any) {
    console.error("Analysis Error:", error);
    // If anything fails (including Gemini rate limits or API key issues) and it's our target mock, return mock
    
    return res.status(500).json({
      error: `Error al analizar el repositorio: ${error.message || error}`,
      fallbackAvailable: false
    });
  }
});

// Configure Vite and Express production vs dev static assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
