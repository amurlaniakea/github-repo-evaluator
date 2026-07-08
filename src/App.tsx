import React, { useState, useEffect } from "react";
import { EvaluationResult } from "./types";
import ScoreGauge from "./components/ScoreGauge";
import DependencyCard from "./components/DependencyCard";
import IssuesCard from "./components/IssuesCard";
import { generateReportPDF } from "./utils/pdfGenerator";
import {
  Github,
  Search,
  GitFork,
  Star,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Code,
  Cpu,
  BookOpen,
  TestTube,
  Key,
  AlertTriangle,
  Loader2,
  FileText,
  AlertCircle
} from "lucide-react";

const LOADING_STEPS = [
  "Estableciendo conexión segura con la API de GitHub...",
  "Clonando el árbol de archivos del repositorio...",
  "Analizando requerimientos (package.json / requirements.txt)...",
  "Leyendo archivos de configuración y código fuente clave...",
  "Compilando contexto y conectando con el modelo Gemini 3.5 Flash...",
  "Auditando estructura de dependencias y legibilidad de código...",
  "Evaluando la calidad de los tests y posibles fallos...",
  "Finalizando la puntuación y estructurando el informe..."
];

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "dependencies" | "legibility" | "tests" | "issues">("summary");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [showTree, setShowTree] = useState(false);

  // Cycle through loading steps to keep user engaged during analysis
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1800);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Handle analyze action
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoUrl,
          githubToken: githubToken || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocurrió un error inesperado al analizar el repositorio.");
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error de conexión con el servidor.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Perform initial default analysis on first mount
  useEffect(() => {
    // Note: We no longer trigger a default analysis on mount to avoid 
    // unintended API calls or confusing the user with fake data.
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Background visual accents */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10 space-y-8">
        
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                RepoSense <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">v1.2</span>
              </h1>
              <p className="text-sm text-zinc-400">Evaluación de Dependencias, Legibilidad, Pruebas y Errores con IA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href="https://github.com/amurlaniakea"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-lg"
            >
              <Github className="w-4 h-4" /> My Profile
            </a>
          </div>
        </header>

        {/* Input Form Section */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">Analizar Repositorio de GitHub</h2>
            <p className="text-sm text-zinc-400">
              Introduce cualquier repositorio público de GitHub para iniciar una auditoría estática automatizada por Inteligencia Artificial.
            </p>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Github className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="usuario/repositorio o enlace completo de github"
                  disabled={isAnalyzing}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className={`px-4 py-3 rounded-xl border transition-all text-sm font-semibold flex items-center gap-1.5 ${
                    showTokenInput || githubToken 
                      ? "bg-zinc-800 border-zinc-700 text-white" 
                      : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                  }`}
                  title="Configurar GitHub Token para repositorios privados o mayor límite de API"
                >
                  <Key className="w-4 h-4" /> Token
                </button>

                <button
                  type="submit"
                  disabled={isAnalyzing || !repoUrl}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 text-sm shrink-0"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analizando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> Evaluar Código
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Optional GitHub Token Box */}
            {showTokenInput && (
              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" /> Token de Acceso Personal (GitHub PAT)
                  </label>
                  <span className="text-[10px] text-zinc-500">Opcional para repos privados o evitar rate-limits</span>
                </div>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="github_pat_..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/30 text-xs font-mono"
                />
              </div>
            )}
          </form>

          {/* Quick links / Suggestions */}
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Sugerencia:</span>
            <span className="text-zinc-600 italic">Introduce el usuario/repo de tu elección</span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">Error en el Análisis</h4>
              <p className="text-sm text-zinc-300">{error}</p>
              <p className="text-xs text-zinc-500 mt-2">
                Sugerencia: Asegúrate de que el URL sea correcto y de que el repositorio sea público. También puedes ingresar un GitHub Token personal si experimentas límites de cuota de la API de GitHub.
              </p>
            </div>
          </div>
        )}

        {/* Loading Panel */}
        {isAnalyzing && (
          <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-2xl">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl animate-pulse" />
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin relative z-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Evaluando repositorio con Gemini</h3>
              <p className="text-sm text-zinc-400 font-mono transition-all duration-300 max-w-md h-8 overflow-hidden">
                {LOADING_STEPS[loadingStep]}
              </p>
            </div>
            <div className="w-full max-w-xs bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-300" 
                style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Evaluation Results Dashboard */}
        {result && !isAnalyzing && (
          <div className="space-y-6">
            
            {/* Repo Title and Description Header */}
            <div className="bg-zinc-900/20 border border-zinc-850 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {result.language || "Código"}
                  </span>
                  <span className="text-zinc-500 text-sm">/</span>
                  <span className="text-zinc-400 text-sm font-semibold">{result.owner}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">{result.repoName}</h2>
                <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">{result.description || "Repositorio de GitHub auditado."}</p>
              </div>

              {/* Stats badges */}
              <div className="flex gap-3 shrink-0">
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 flex flex-col items-center justify-center min-w-[80px]">
                  <Star className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-sm font-extrabold text-white">{result.stars}</span>
                  <span className="text-[10px] text-zinc-500 font-medium uppercase mt-0.5">Stars</span>
                </div>
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 flex flex-col items-center justify-center min-w-[80px]">
                  <GitFork className="w-4 h-4 text-purple-400 mb-1" />
                  <span className="text-sm font-extrabold text-white">{result.forks}</span>
                  <span className="text-[10px] text-zinc-500 font-medium uppercase mt-0.5">Forks</span>
                </div>
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 flex flex-col items-center justify-center min-w-[80px]">
                  <FileCode className="w-4 h-4 text-blue-400 mb-1" />
                  <span className="text-sm font-extrabold text-white">{result.tree ? result.tree.length : 0}</span>
                  <span className="text-[10px] text-zinc-500 font-medium uppercase mt-0.5">Archivos</span>
                </div>
              </div>
            </div>

            {/* Overall Score Wheel Row */}
            <ScoreGauge scores={result.scores} />

            {/* Custom Tabbed Navigation */}
            <div className="flex overflow-x-auto border-b border-zinc-800 gap-1 pb-px scrollbar-thin">
              <button
                onClick={() => setActiveTab("summary")}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "summary" 
                    ? "border-emerald-400 text-white bg-emerald-500/5" 
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <FileText className="w-4 h-4" /> Resumen General
              </button>
              <button
                onClick={() => setActiveTab("dependencies")}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "dependencies" 
                    ? "border-emerald-400 text-white bg-emerald-500/5" 
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Cpu className="w-4 h-4" /> Estructura de Dependencias
              </button>
              <button
                onClick={() => setActiveTab("legibility")}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "legibility" 
                    ? "border-emerald-400 text-white bg-emerald-500/5" 
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <BookOpen className="w-4 h-4" /> Legibilidad de Código
              </button>
              <button
                onClick={() => setActiveTab("tests")}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "tests" 
                    ? "border-emerald-400 text-white bg-emerald-500/5" 
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <TestTube className="w-4 h-4" /> Calidad de Pruebas (Tests)
              </button>
              <button
                onClick={() => setActiveTab("issues")}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "issues" 
                    ? "border-emerald-400 text-white bg-emerald-500/5" 
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> Errores e Issues ({result.analysis.issues ? result.analysis.issues.length : 0})
              </button>
            </div>

            {/* Tab Contents Frame */}
            <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 shadow-xl min-h-[300px]">
              
              {/* Tab: Summary */}
              {activeTab === "summary" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Informe Arquitectónico</h4>
                    <p className="text-zinc-100 leading-relaxed text-sm whitespace-pre-line">{result.analysis.summary}</p>
                  </div>

                  {/* Expandable File Tree List */}
                  <div className="border border-zinc-800/80 rounded-xl bg-zinc-950/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Code className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold">Estructura del Proyecto ({result.tree ? result.tree.length : 0} archivos)</span>
                      </div>
                      <button
                        onClick={() => setShowTree(!showTree)}
                        className="text-xs text-zinc-400 hover:text-white hover:underline transition-all"
                      >
                        {showTree ? "Contraer" : "Explorar Árbol Completo"}
                      </button>
                    </div>

                    {showTree && result.tree && result.tree.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-3 border-t border-zinc-850 text-xs font-mono text-zinc-400 max-h-96 overflow-y-auto">
                        {result.tree.map((filePath, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-1.5 hover:bg-zinc-850/40 rounded transition-colors truncate">
                            <span className="text-zinc-600">├─</span>
                            <span className="text-zinc-300 truncate" title={filePath}>{filePath}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Dependencies */}
              {activeTab === "dependencies" && (
                <DependencyCard analysis={result.analysis.dependencies} />
              )}

              {/* Tab: Legibility */}
              {activeTab === "legibility" && (
                <div className="space-y-6">
                  {/* Status Panel */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-zinc-950/40 rounded-xl border border-zinc-800/80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Legibilidad y Organización</h4>
                      <p className="text-zinc-200 text-sm">{result.analysis.legibility.details}</p>
                    </div>
                  </div>

                  {/* Highlights Bullet List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Aspectos Clave Encontrados</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.analysis.legibility.highlights && result.analysis.legibility.highlights.length > 0 ? (
                        result.analysis.legibility.highlights.map((highlight, idx) => (
                          <div key={idx} className="flex gap-3 p-4 rounded-xl bg-zinc-950/20 border border-zinc-850 hover:border-zinc-800 transition-all">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-zinc-300 leading-relaxed">{highlight}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">No se especificaron detalles de legibilidad en el reporte.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Tests */}
              {activeTab === "tests" && (
                <div className="space-y-6">
                  {/* Status panel */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-zinc-950/40 rounded-xl border border-zinc-800/80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Calidad de Pruebas y Cobertura</h4>
                      <p className="text-zinc-200 text-sm">{result.analysis.tests.details}</p>
                    </div>
                  </div>

                  {/* Coverage Gauge Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-xl bg-zinc-950/30 border border-zinc-800/80 flex flex-col justify-center space-y-2">
                      <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Cobertura Estimada</h5>
                      <span className="text-3xl font-extrabold text-white tracking-tight">{result.analysis.tests.coverageEst}</span>
                      <p className="text-xs text-zinc-500">Estimación basada en la presencia de archivos e implementaciones de suite en el repositorio.</p>
                    </div>

                    <div className="p-5 rounded-xl bg-zinc-950/30 border border-zinc-800/80 space-y-3">
                      <h5 className="text-sm font-bold text-white uppercase tracking-wider">Recomendación para Suite de Pruebas</h5>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Para este tipo de proyecto híbrido ({result.language}), se aconseja mantener una cobertura de al menos 75%. Implementa pruebas de contrato entre Python y TypeScript para asegurar que el formato de los objetos de los agentes no se rompa al cruzar la pasarela Express.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Issues & Bugs */}
              {activeTab === "issues" && (
                <IssuesCard issues={result.analysis.issues} />
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
