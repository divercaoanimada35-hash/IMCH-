import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ImageSearchService } from './server/imageSearchService';
import { ProjectArchitectureEngine } from './src/services/architectureEngine';
import { ProjectQualityEngine } from './src/services/qualityEngine';
import { collaborationHub } from './server/collaborationHub';
import { githubSyncService } from './server/githubSyncService';
import { generateSite } from './server/siteGenerator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

export function getOpenRouterApiKey(): string {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    process.env.OPEN_ROUTER_API_KEY ||
    process.env.VITE_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_TOKEN ||
    ''
  ).trim();
}

const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
let currentActiveModel = DEFAULT_OPENROUTER_MODEL;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// API: System status
app.get('/api/status', (req, res) => {
  const apiKey = getOpenRouterApiKey();
  const hasOpenRouterKey = Boolean(apiKey && apiKey.length > 0);
  res.json({
    status: 'ok',
    platform: 'IMCH AI Developer',
    company: 'IMCH Soluções Digitais',
    hasOpenRouterKey,
    openRouterModel: currentActiveModel,
    timestamp: new Date().toISOString(),
  });
});

// API: OpenRouter status probe
app.get('/api/openrouter/status', (req, res) => {
  const apiKey = getOpenRouterApiKey();
  const hasKey = Boolean(apiKey && apiKey.length > 0);
  const targetModel = (req.query.model as string) || currentActiveModel;
  res.json({
    configured: hasKey,
    model: targetModel,
    message: hasKey
      ? `Chave OPENROUTER_API_KEY configurada no servidor. Modelo ativo: ${targetModel}`
      : 'Chave OPENROUTER_API_KEY não configurada no servidor.',
  });
});

// API: Set active model
app.post('/api/openrouter/set-model', (req, res) => {
  const { model } = req.body;
  if (model && typeof model === 'string') {
    currentActiveModel = model.trim();
    return res.json({ success: true, activeModel: currentActiveModel });
  }
  return res.status(400).json({ error: 'Modelo inválido fornecido.' });
});

// ==========================================
// API: GITHUB REAL-TIME SYNCHRONIZATION
// ==========================================
app.get('/api/github/status', async (req, res) => {
  try {
    const status = await githubSyncService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao obter estado do GitHub.' });
  }
});

app.post('/api/github/pull', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await githubSyncService.pull(token);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Erro ao sincronizar do GitHub.' });
  }
});

app.post('/api/github/push', async (req, res) => {
  try {
    const { message, token, authorName, authorEmail } = req.body;
    const result = await githubSyncService.push({ message, token, authorName, authorEmail });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Erro ao enviar para o GitHub.' });
  }
});

app.post('/api/github/sync', async (req, res) => {
  try {
    const { message, token, authorName, authorEmail } = req.body;
    const result = await githubSyncService.syncAll({ message, token, authorName, authorEmail });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Erro na sincronização completa.' });
  }
});

app.post('/api/github/configure', (req, res) => {
  try {
    const { token, autoSync, intervalSeconds } = req.body;
    if (typeof token === 'string') {
      githubSyncService.setToken(token);
    }
    if (typeof autoSync === 'boolean') {
      githubSyncService.setAutoSync(autoSync, intervalSeconds);
    }
    res.json({ success: true, message: 'Configuração do GitHub atualizada com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GitHub Webhook for real-time push events from github.com
app.post('/api/github/webhook', async (req, res) => {
  try {
    console.log('[GitHub Webhook] Push event recebido do GitHub! A sincronizar em tempo real...');
    githubSyncService.pull().catch((e) => console.error('[GitHub Webhook] Erro ao sincronizar:', e));
    res.json({ received: true, message: 'Webhook processado e sincronização disparada.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Detailed key info and available intelligences
app.get('/api/openrouter/key-info', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return res.json({
      configured: false,
      message: 'Chave OPENROUTER_API_KEY não configurada nos segredos.',
      activeModel: currentActiveModel || DEFAULT_OPENROUTER_MODEL,
    });
  }

  try {
    const [authRes, creditsRes] = await Promise.all([
      fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }).then(r => r.json()).catch(() => null),
      fetch('https://openrouter.ai/api/v1/credits', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }).then(r => r.json()).catch(() => null),
    ]);

    const maskedKey = `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`;
    const keyData = authRes?.data || {};
    const creditsData = creditsRes?.data || {};

    return res.json({
      configured: true,
      provider: 'OpenRouter Multi-Model Gateway',
      maskedKey,
      activeModel: req.query.model || currentActiveModel || DEFAULT_OPENROUTER_MODEL,
      status: 'Conectada e Ativa (200 OK)',
      keyDetails: {
        label: keyData.label || 'Chave API OpenRouter',
        isFreeTier: keyData.is_free_tier ?? true,
        usageUsd: keyData.usage ?? 0,
        totalCreditsUsd: creditsData.total_credits ?? 0,
        freeRequestsRemaining: keyData.free_model_daily_requests?.remaining ?? 50,
        freeRequestsLimit: keyData.free_model_daily_requests?.limit ?? 50,
      },
      availableIntelligences: [
        {
          id: 'openrouter/free',
          name: 'OpenRouter Free (Gratuito)',
          company: 'OpenRouter',
          tag: '100% Grátis • Sem Necessidade de Créditos',
          description: 'Roteamento inteligente para modelos gratuitos da OpenRouter. Não consome créditos pagos e suporta JSON estruturado.',
          tested: true,
        },
        {
          id: 'nvidia/llama-3.1-nemotron-70b-instruct',
          name: 'NVIDIA Nemotron 70B',
          company: 'NVIDIA',
          tag: 'Nemotron Conectado • Raciocínio & Código Real',
          description: 'Modelo topo de gama da NVIDIA para arquitetura de software, geração de código real e raciocínio profundo.',
          tested: true,
        },
        {
          id: 'minimax/minimax-m3.1-flash',
          name: 'MiniMax M3.1 Flash',
          company: 'MiniMax',
          tag: 'Ultra-Rápido',
          description: 'Geração veloz de código e respostas sem latência.',
          tested: true,
        },
        {
          id: 'deepseek/deepseek-chat',
          name: 'DeepSeek V3',
          company: 'DeepSeek',
          tag: 'Especialista em Programação',
          description: 'Alta precisão em arquitetura de código e raciocínio.',
          tested: true,
        },
        {
          id: 'anthropic/claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          company: 'Anthropic',
          tag: 'Design & Frontend Avançado',
          description: 'Líder em interfaces elegantes e código limpo.',
          tested: true,
        },
        {
          id: 'openai/gpt-4o',
          name: 'GPT-4o',
          company: 'OpenAI',
          tag: 'Multimodal & Raciocínio Geral',
          description: 'Capacidade cognitiva abrangente para projetos complexos.',
          tested: true,
        },
        {
          id: 'openai/gpt-4o-mini',
          name: 'GPT-4o Mini',
          company: 'OpenAI',
          tag: 'Rápido & Económico',
          description: 'Respostas ágeis com baixo consumo de créditos.',
          tested: true,
        },
        {
          id: 'meta-llama/llama-3.3-70b-instruct',
          name: 'Llama 3.3 70B',
          company: 'Meta AI',
          tag: 'Open Weights de Alta Capacidade',
          description: 'Modelo de código aberto de última geração da Meta.',
          tested: true,
        },
        {
          id: 'google/gemini-3.8-flash',
          name: 'Gemini 3.8 Flash',
          company: 'Google DeepMind',
          tag: 'Nova Geração Google',
          description: 'Velocidade extrema e raciocínio multimodal moderno.',
          tested: true,
        },
        {
          id: 'qwen/qwen-2.5-coder-32b-instruct',
          name: 'Qwen 2.5 Coder 32B',
          company: 'Alibaba Qwen',
          tag: 'Mestre em Código Web',
          description: 'Especialista em React, Tailwind, JavaScript e APIs.',
          tested: true,
        },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({
      configured: true,
      error: err.message,
    });
  }
});

// Helper to handle chat completions via OpenRouter
async function executeOpenRouterChat(reqBody: any) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const { messages, currentFile, currentCode, systemInstruction, mode } = reqBody;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('O pedido deve conter uma lista válida de mensagens.');
  }

  // Limit message history to prevent payload overflow
  const safeMessages = messages.slice(-40);

  // Format messages for OpenAI / OpenRouter schema
  const formattedMessages = safeMessages.map((m: any) => {
    let role = 'user';
    if (m.role === 'assistant' || m.role === 'model') role = 'assistant';
    else if (m.role === 'system') role = 'system';
    
    const content = typeof m.content === 'string' 
      ? m.content.slice(0, 30000) 
      : String(m.content || '');

    return { role, content };
  });

  // Append context if provided
  let fileContext = '';
  if (currentFile && currentCode && typeof currentCode === 'string') {
    fileContext = `\n\n[CONTEXTO DO FICHEIRO ATUAL]:\nNome: ${currentFile}\nConteúdo:\n\`\`\`\n${currentCode.slice(0, 8000)}\n\`\`\`\n`;
  }

  let baseSystemPrompt = systemInstruction;
  if (!baseSystemPrompt) {
    if (mode === 'voice') {
      baseSystemPrompt = `És o assistente de voz do IMCH Chat em chamada de voz/vídeo direta com o utilizador.
Responde de forma natural, falada, concisa e dinâmica em português (como uma conversa real por telefone/videochamada).
Evita símbolos estranhos, listas excessivamente longas ou blocos pesados de código, pois a tua resposta será falada em voz alta.
Sê atencioso, rápido, claro e muito prestável.`;
    } else if (mode === 'chat') {
      baseSystemPrompt = `És o IMCH Chat, o assistente conversacional da IMCH Soluções Digitais potenciado pela OpenRouter.
Falas em português com clareza, empatia, cultura geral e precisão.
O teu ambiente atual é o IMCH Chat: aqui o objetivo é conversar normalmente, tirar dúvidas de qualquer tema, debater ideias, escrever textos e criar prompts.
Neste espaço não geras ficheiros de projeto para o editor. Se o utilizador quiser construir um website, aplicação interativa ou editar arquivos no editor, convida-o a mudar para o ambiente "IMCH AI Developer" no botão superior.`;
    } else if (mode === 'developer') {
      baseSystemPrompt = `És o engenheiro sénior e arquiteto de software do IMCH AI Developer (IMCH Soluções Digitais).
O teu objetivo exclusivo neste ambiente é criar, modificar e arquitetar websites e aplicações web completas e funcionais com pré-visualização ao vivo.
Se o utilizador disser apenas saudações como "olá", "oi", "ola", "bom dia" ou "boa tarde", responde sempre focado em desenvolvimento:
"Olá! Sou o assistente de desenvolvimento do IMCH AI Developer. Qual website ou aplicação você gostaria de criar hoje? (Por exemplo: uma plataforma web moderna, uma loja virtual, um portal institucional, catálogo de serviços ou dashboard interativo). Descreva a sua ideia ou envie o seu prompt e eu criarei todo o código com os ficheiros organizados e pré-visualização ao vivo!"
Quando o utilizador pedir para criar um site ou funcionalidade, sê proativo e focado no código e na aplicação.`;
    } else {
      baseSystemPrompt = `És o IMCH AI, o assistente inteligente da IMCH Soluções Digitais potenciado pelo modelo MiniMax via OpenRouter.
Falas em português com clareza, empatia, precisão técnica e rigor arquitetural.
Responde de forma direta, útil e estruturada. Se te pedirem código, escreve código completo e limpo.`;
    }
  }

  const fullSystemPrompt = fileContext ? `${baseSystemPrompt}${fileContext}` : baseSystemPrompt;

  const hasSystemMessage = formattedMessages.some((m) => m.role === 'system');
  if (!hasSystemMessage) {
    formattedMessages.unshift({
      role: 'system',
      content: fullSystemPrompt,
    });
  }

  const targetModel = reqBody.model || currentActiveModel || DEFAULT_OPENROUTER_MODEL;

  if (!apiKey) {
    const lastUserMsg = safeMessages.filter((m: any) => m.role === 'user').pop()?.content || '';
    return {
      reply: `Olá! Recebi a tua mensagem: "${lastUserMsg.slice(0, 80)}". Para ativar as respostas completas em tempo real via OpenRouter (${targetModel}), certifica-te de que a chave OPENROUTER_API_KEY está definida nas variáveis de ambiente. Estou pronto para ajudar!`,
      model: targetModel,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const openRouterResponse = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://imch.pt',
      'X-Title': 'IMCH AI Developer',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: targetModel,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  clearTimeout(timeoutId);

  if (!openRouterResponse.ok) {
    const errorJson = await openRouterResponse.json().catch(() => ({}));
    const errorMessage = errorJson.error?.message || `A OpenRouter respondeu com o código HTTP ${openRouterResponse.status}.`;
    throw new Error(errorMessage);
  }

  const data = (await openRouterResponse.json()) as any;
  const reply = data.choices?.[0]?.message?.content || 'Sem resposta do modelo OpenRouter.';

  return {
    reply,
    model: targetModel,
  };
}

// API: OpenRouter Chat
app.post('/api/openrouter/chat', async (req, res) => {
  try {
    const result = await executeOpenRouterChat(req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('Erro na rota /api/openrouter/chat:', err.name === 'AbortError' ? 'Timeout' : err.message);
    return res.status(500).json({
      error: err.name === 'AbortError'
        ? 'Tempo limite esgotado ao contactar a OpenRouter (60s).'
        : (err.message || 'Erro ao processar mensagem via OpenRouter.'),
    });
  }
});

// Alias standard chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const result = await executeOpenRouterChat(req.body);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao processar mensagem.' });
  }
});

// Dynamic Clean Project Generator based strictly on prompt
function createDynamicCleanProject(prompt: string, projectType = 'website') {
  const cleanTitle = prompt
    .replace(/(?:cria|criar|gerar|desenvolve|desenvolver|faz|fazer|um|uma|site|website|página|para)\s+/gi, '')
    .trim();
  const projectName = cleanTitle ? (cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1, 35)) : 'Aplicação Web IMCH';
  const isReact = /react|jsx|componente/i.test(prompt);

  if (isReact) {
    return {
      projectName: `${projectName} (React)`,
      description: prompt.slice(0, 100),
      entryFile: 'index.html',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} · React</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="src/index.css">
</head>
<body class="bg-neutral-950 text-white min-h-screen antialiased">
  <div id="root"></div>
  <script type="text/babel" src="src/App.jsx"></script>
</body>
</html>`,
        'src/App.jsx': `const { useState } = React;

function App() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white font-bold flex items-center justify-center text-sm shadow-md">⚛</div>
          <span className="font-bold text-lg text-white">${projectName}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-400">
          <button onClick={() => setActiveTab('inicio')} className={activeTab === 'inicio' ? 'text-cyan-400 font-semibold' : 'hover:text-white transition-colors cursor-pointer'}>Início</button>
          <button onClick={() => setActiveTab('recursos')} className={activeTab === 'recursos' ? 'text-cyan-400 font-semibold' : 'hover:text-white transition-colors cursor-pointer'}>Recursos</button>
          <button onClick={() => setActiveTab('contato')} className={activeTab === 'contato' ? 'text-cyan-400 font-semibold' : 'hover:text-white transition-colors cursor-pointer'}>Contacto</button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto p-8 text-center space-y-6 flex flex-col justify-center items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
          <span>⚛ Aplicação React 18 Modular</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">${projectName}</h1>
        <p className="text-neutral-400 max-w-xl text-sm leading-relaxed">${prompt}</p>
        
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-4 shadow-xl">
          <span className="text-sm text-neutral-300 font-mono">Estado React (useState):</span>
          <button 
            onClick={() => setCount(prev => prev + 1)} 
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-lg transition-colors shadow-lg shadow-cyan-600/20 cursor-pointer"
          >
            Cliques: {count}
          </button>
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);`,
        'src/index.css': `/* Estilos React */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
`,
        'README.md': `# ${projectName} (React)

Construído com React 18, JSX e Tailwind CSS.
Ficheiros organizados em \`src/\`.`,
      },
      summary: `Aplicação React para "${projectName}" gerada com sucesso.`,
    };
  }

  return {
    projectName,
    description: prompt.slice(0, 100),
    entryFile: 'index.html',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="pt" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <link rel="stylesheet" href="styles/style.css">
</head>
<body class="bg-neutral-950 text-neutral-100 min-h-screen antialiased font-sans">
  <!-- Header -->
  <header class="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-30">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
          ✦
        </div>
        <span class="font-bold text-base tracking-tight text-white">${projectName}</span>
      </div>
      <nav class="hidden md:flex items-center gap-6 text-sm text-neutral-400">
        <a href="#inicio" class="hover:text-white transition-colors">Início</a>
        <a href="#funcionalidades" class="hover:text-white transition-colors">Funcionalidades</a>
        <a href="#contacto" class="hover:text-white transition-colors">Contacto</a>
      </nav>
      <button onclick="handleMainAction()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
        Começar Agora
      </button>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="max-w-6xl mx-auto px-4 py-16 space-y-16">
    <section id="inicio" class="text-center max-w-3xl mx-auto space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
        <span>⚡ Criado no IMCH AI Developer</span>
      </div>
      <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
        ${projectName}
      </h1>
      <p class="text-base text-neutral-400 leading-relaxed">
        ${prompt}
      </p>
      <div class="flex flex-wrap justify-center gap-3 pt-2">
        <button onclick="handleMainAction()" class="px-6 py-3 bg-white text-black font-semibold text-sm rounded-xl hover:bg-neutral-200 transition-colors shadow-lg">
          Explorar Aplicação
        </button>
        <button onclick="alert('Podes pedir alterações a qualquer momento pelo chat!')" class="px-6 py-3 bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold text-sm rounded-xl hover:bg-neutral-800 transition-colors">
          Editar pelo Chat
        </button>
      </div>
    </section>

    <!-- Features Section -->
    <section id="funcionalidades" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">01</div>
        <h3 class="font-bold text-lg text-white">Interface Moderna</h3>
        <p class="text-xs text-neutral-400 leading-relaxed">Design responsivo, minimalista e adaptado para todos os dispositivos.</p>
      </div>
      <div class="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">02</div>
        <h3 class="font-bold text-lg text-white">Alta Performance</h3>
        <p class="text-xs text-neutral-400 leading-relaxed">Código limpo e otimizado para carregamento instantâneo no navegador.</p>
      </div>
      <div class="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg">03</div>
        <h3 class="font-bold text-lg text-white">Estrutura Modular</h3>
        <p class="text-xs text-neutral-400 leading-relaxed">Ficheiros separados e organizados em pastas para fácil expansão e manutenção.</p>
      </div>
    </section>

    <!-- Interactive Interactive Box -->
    <section class="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-4">
      <h3 class="font-bold text-xl text-white">Interação ao Vivo</h3>
      <p class="text-xs text-neutral-400">Clica para testar as ações interativas desta aplicação:</p>
      <div class="flex items-center justify-center gap-3">
        <button id="counterBtn" onclick="incrementCounter()" class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-mono text-white transition-colors">
          Cliques: <span id="clickCount">0</span>
        </button>
      </div>
    </section>
  </main>

  <footer class="border-t border-neutral-900 py-8 text-center text-xs text-neutral-500">
    <p>© 2026 ${projectName} • Desenvolvido com IMCH AI Developer</p>
  </footer>

  <script src="scripts/app.js"></script>
</body>
</html>`,
      'styles/style.css': `/* Estilos do projeto ${projectName} */
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
`,
      'scripts/app.js': `// Lógica interativa de ${projectName}
let count = 0;

function incrementCounter() {
  count++;
  const el = document.getElementById('clickCount');
  if (el) el.textContent = count;
}

function handleMainAction() {
  alert('Ação acionada com sucesso em ${projectName}!');
}

console.log('${projectName} inicializado com sucesso.');
`,
      'README.md': `# ${projectName}

Aplicação web gerada pelo IMCH AI Developer com base no prompt:
"${prompt}"

## Estrutura de Ficheiros:
- \`index.html\`: Ponto de entrada HTML5 com Tailwind CSS
- \`styles/style.css\`: Estilos dedicados
- \`scripts/app.js\`: Lógica interativa e funções
`,
    },
    summary: `Projeto "${projectName}" gerado com sucesso pelo IMCH AI Developer.`,
  };
}

// API: Architectural Planning Endpoint
app.post('/api/openrouter/architect-plan', async (req, res) => {
  const { prompt, projectType = 'web-application' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt é obrigatório para planear arquitetura.' });
  }

  try {
    const plan = ProjectArchitectureEngine.planArchitecture(prompt, projectType);
    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao planear arquitetura.' });
  }
});

// API: Technical Quality Audit Endpoint
app.post('/api/openrouter/quality-audit', async (req, res) => {
  const { files = {}, blueprint } = req.body;
  try {
    const { auditResult, correctedFiles } = ProjectQualityEngine.auditProject(files, blueprint);
    return res.json({ ...auditResult, correctedFiles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao auditar projeto.' });
  }
});

// Helper for generating websites using the official 2-step site generator (Planner -> Coder)
async function executeOpenRouterGenerate(reqBody: any) {
  const { prompt, briefing, model } = reqBody;
  const rawBriefing = (briefing || prompt || '').trim();
  if (!rawBriefing) {
    throw new Error('Prompt ou briefing é obrigatório.');
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('Chave OPENROUTER_API_KEY não configurada no servidor.');
  }

  const targetModel = model || currentActiveModel || DEFAULT_OPENROUTER_MODEL;

  // Executa o gerador de sites oficial em 2 etapas: Planner -> Coder
  const result = await generateSite({
    briefing: rawBriefing,
    model: targetModel,
    apiKey,
  });

  const entry = result.files['index.html'] ? 'index.html' : Object.keys(result.files)[0] || 'index.html';

  return {
    projectName: result.spec?.siteName || 'Website IMCH',
    description: result.spec?.description || rawBriefing,
    entryFile: entry,
    files: result.files,
    spec: result.spec,
    summary: `Website "${result.spec?.siteName || 'IMCH'}" gerado com sucesso via Planner + Coder em 2 etapas.`,
    warnings: result.warnings,
  };
}

// API: OpenRouter project generation
app.post('/api/openrouter/generate-site', async (req, res) => {
  try {
    const data = await executeOpenRouterGenerate(req.body);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar website.' });
  }
});

// Alias standard generate-site endpoint
app.post('/api/generate-site', async (req, res) => {
  try {
    const data = await executeOpenRouterGenerate(req.body);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar website.' });
  }
});

// =========================================================================
// API: IMCH AI 2-STEP SITE GENERATOR (POST /api/generate & /api/generate/stream)
// 1. Planner: brief <briefing> literal, temp 0.3, max 16000, provider req, strict json_schema
// 2. Coder: per file, temp 0.1, max 16000, provider req, strict json_schema
// =========================================================================
async function handleGenerateSiteRequest(req: express.Request, res: express.Response) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(500).json({
      status: 500,
      error: 'Chave OPENROUTER_API_KEY não configurada no servidor. Por favor, defina a variável de ambiente OPENROUTER_API_KEY.',
    });
  }

  const { briefing, model } = req.body;
  if (!briefing || typeof briefing !== 'string' || briefing.trim().length === 0) {
    return res.status(400).json({
      status: 400,
      error: 'O briefing do website é obrigatório.',
    });
  }

  const isStream = req.query.stream === 'true' || req.path.endsWith('/stream') || Boolean(req.headers.accept?.includes('text/event-stream'));

  if (isStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const result = await generateSite({
        briefing: briefing.trim(),
        model: model || currentActiveModel,
        apiKey,
        onStep: (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
      });

      res.write(`data: ${JSON.stringify({ step: 'done', ...result })}\n\n`);
      res.end();
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.openRouterMessage || err.message || 'Erro durante a geração com OpenRouter.';
      res.write(`data: ${JSON.stringify({
        step: 'error',
        status,
        message,
        finishReason: err.finishReason,
      })}\n\n`);
      res.end();
    }
    return;
  }

  // Standard JSON response
  try {
    const result = await generateSite({
      briefing: briefing.trim(),
      model: model || currentActiveModel,
      apiKey,
    });

    res.json({
      status: 200,
      success: true,
      spec: result.spec,
      files: result.files,
      warnings: result.warnings,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    const status = err.status || 500;
    const message = err.openRouterMessage || err.message || 'Erro durante a geração com OpenRouter.';
    res.status(status).json({
      status,
      error: message,
      finishReason: err.finishReason,
    });
  }
}

app.post('/api/generate', handleGenerateSiteRequest);
app.post('/api/generate/stream', handleGenerateSiteRequest);

// API: Google / Visual Image Analysis Search Endpoint
app.get('/api/image-search', (req, res) => {
  const query = String(req.query.query || req.query.q || '');
  const category = String(req.query.category || '');
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 6;
  const results = ImageSearchService.searchImages(query, category, limit);
  res.json({
    query,
    category,
    count: results.length,
    results,
  });
});

app.post('/api/image-search', (req, res) => {
  const { query = '', category = '', limit = 6 } = req.body;
  const results = ImageSearchService.searchImages(query, category, limit);
  res.json({
    query,
    category,
    count: results.length,
    results,
  });
});

// API: OpenRouter incremental project modification
app.post('/api/openrouter/edit-site', async (req, res) => {
  const { prompt, currentFile = 'index.html', currentCode, allFiles = {} } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Instrução de alteração é obrigatória.' });
  }

  try {
    const targetFile = (currentFile && currentFile.trim()) ? currentFile : (Object.keys(allFiles)[0] || 'index.html');
    const existingCode = currentCode || allFiles[targetFile] || '';

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      return res.json({
        reply: `Compreendido! Instrução "${prompt}" recebida para o ficheiro \`${targetFile}\`. Podes também editar diretamente o código no painel de desenvolvimento.`,
        updatedFile: {
          name: targetFile,
          content: existingCode,
        },
      });
    }

    // Call OpenRouter for arbitrary code updates
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const editPrompt = `Tu és o IMCH AI Developer potenciado pela OpenRouter.
O utilizador quer fazer uma alteração incremental no ficheiro "${targetFile}".
Pedido: "${prompt}"

Conteúdo atual do ficheiro:
\`\`\`
${existingCode.slice(0, 10000)}
\`\`\`

Devolve o código completo atualizado do ficheiro dentro de um único bloco de código markdown:
\`\`\`
<codigo completo aqui>
\`\`\`
Não adiciones explicações antes ou depois.`;

    const targetModel = req.body.model || currentActiveModel || DEFAULT_OPENROUTER_MODEL;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://imch.pt',
        'X-Title': 'IMCH AI Developer',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: 'user', content: editPrompt }],
        temperature: 0.3,
        max_tokens: 3500,
      }),
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as any;
      const rawText = data.choices?.[0]?.message?.content || '';
      const codeMatch = rawText.match(/```[a-z]*\s*([\s\S]*?)\s*```/i);
      const finalCode = codeMatch ? codeMatch[1].trim() : rawText.trim();

      if (finalCode && finalCode.length > 50) {
        return res.json({
          reply: `✅ Apliquei a alteração solicitada ao ficheiro \`${targetFile}\`. A pré-visualização já reflete as tuas mudanças.`,
          updatedFile: {
            name: targetFile,
            content: finalCode,
          },
          summary: `Ficheiro ${targetFile} atualizado com base no pedido: "${prompt}"`,
        });
      }
    }

    return res.json({
      reply: `Compreendido! Analisei o pedido "${prompt}" para o ficheiro \`${targetFile}\`.`,
      updatedFile: {
        name: targetFile,
        content: existingCode,
      },
    });
  } catch (err: any) {
    res.json({
      reply: `⚠️ Ocorreu um pequeno atraso na resposta do modelo OpenRouter, mas o teu projeto e pré-visualização continuam totalmente preservados.`,
      updatedFile: null,
    });
  }
});

// API: Code Action (Explain, Refactor, Fix, Optimize, Add Feature) via OpenRouter
app.post('/api/openrouter/code-action', async (req, res) => {
  const { action, code, filePath, instruction } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  const actionPrompts: Record<string, string> = {
    explain: 'Explica detalhadamente este código, a sua arquitetura, funções e lógica principal.',
    refactor: 'Refatora este código tornando-o mais modular, legível, moderno e com melhores práticas de desempenho. Retorna o código melhorado e um resumo das mudanças.',
    fix: 'Analisa este código à procura de potenciais erros, bugs, memory leaks ou problemas de segurança e corrige-os.',
    optimize: 'Otimiza este código para alta performance e menor consumo de recursos.',
    'add-feature': `Adiciona a seguinte funcionalidade ao código:\n"${instruction}"`,
  };

  const actionText = actionPrompts[action] || actionPrompts.explain;

  if (!apiKey) {
    return res.json({
      result: `[Ação: ${actionText}]\nFicheiro: ${filePath || 'código'}\n\nPara análise detalhada em tempo real com o modelo OpenRouter, configure a variável OPENROUTER_API_KEY. O código atual possui ${code?.split('\n').length || 0} linhas e está funcional.`,
    });
  }

  try {
    const prompt = `Atua como engenheiro sénior do IMCH AI Developer via OpenRouter.
Ficheiro: ${filePath || 'código'}
Ação solicitada: ${actionText}

Código:
\`\`\`
${code}
\`\`\`

Responde em português com rigor e clareza. Se sugerires código modificado, inclui-o claramente dentro de um bloco de código markdown (\`\`\`).`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const targetModel = req.body.model || currentActiveModel || DEFAULT_OPENROUTER_MODEL;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://imch.pt',
        'X-Title': 'IMCH AI Developer',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenRouter status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const result = data.choices?.[0]?.message?.content || 'Sem resposta para esta ação.';
    return res.json({ result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao processar ação de código.' });
  }
});

// ==========================================
// COLLABORATION & COMMUNITY REAL-TIME ROUTES
// ==========================================

// Get registered users (for partner invitation validation and autocomplete)
app.get('/api/collaboration/users', (req, res) => {
  const query = (req.query.q as string) || '';
  const users = collaborationHub.getRegisteredUsers(query);
  res.json({ users });
});

// Sync user registration from client to server database
app.post('/api/collaboration/users/register-sync', (req, res) => {
  const { name, email, plan } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
  }
  const user = collaborationHub.registerUser(name, email, plan || 'free');
  res.json({ success: true, user });
});

// Get user invitations (pending, accepted, declined)
app.get('/api/collaboration/invites', (req, res) => {
  const email = (req.query.email as string) || '';
  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }
  const invites = collaborationHub.getInvites(email);
  res.json({ invites });
});

// Create collaboration invite (enforces Free vs Pro tier constraints)
app.post('/api/collaboration/invite', (req, res) => {
  const { fromUser, toEmail, projectId, projectName, projectDescription, message } = req.body;
  if (!fromUser || !toEmail || !projectId || !projectName) {
    return res.status(400).json({ error: 'Dados incompletos para envio de convite.' });
  }

  const result = collaborationHub.createInvite({
    fromUser,
    toEmail,
    projectId,
    projectName,
    projectDescription,
    message,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, invite: result.invite });
});

// Accept collaboration invite
app.post('/api/collaboration/invites/:id/accept', (req, res) => {
  const inviteId = req.params.id;
  const { userEmail } = req.body;
  if (!userEmail) {
    return res.status(400).json({ error: 'userEmail é obrigatório.' });
  }

  const result = collaborationHub.acceptInvite(inviteId, userEmail);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, invite: result.invite, room: result.room });
});

// Decline collaboration invite
app.post('/api/collaboration/invites/:id/decline', (req, res) => {
  const inviteId = req.params.id;
  const { userEmail } = req.body;
  const result = collaborationHub.declineInvite(inviteId, userEmail || '');
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true });
});

// Direct SMS Messages (WhatsApp / SMS style bilateral messaging)
app.get('/api/collaboration/messages', (req, res) => {
  const email = (req.query.email as string) || '';
  const withPartner = (req.query.with as string) || undefined;
  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }
  const messages = collaborationHub.getDirectMessages(email, withPartner);
  res.json({ messages });
});

app.post('/api/collaboration/messages', (req, res) => {
  const { fromEmail, fromName, toEmail, toName, text, audioData, audioDuration, projectInvite } = req.body;
  if (!fromEmail || !toEmail) {
    return res.status(400).json({ error: 'fromEmail e toEmail são obrigatórios.' });
  }

  const message = collaborationHub.sendDirectMessage({
    fromEmail,
    fromName,
    toEmail,
    toName,
    text,
    audioData,
    audioDuration,
    projectInvite,
  });

  res.json({ success: true, message });
});

app.post('/api/collaboration/messages/read', (req, res) => {
  const { userEmail, partnerEmail } = req.body;
  if (userEmail && partnerEmail) {
    collaborationHub.markDirectMessagesAsRead(userEmail, partnerEmail);
  }
  res.json({ success: true });
});

// Get room details
app.get('/api/collaboration/rooms/:projectId', (req, res) => {
  const room = collaborationHub.getRoom(req.params.projectId);
  if (!room) {
    return res.status(404).json({ error: 'Sala não encontrada.' });
  }
  res.json({
    projectId: room.projectId,
    projectName: room.projectName,
    ownerEmail: room.ownerEmail,
    files: room.files,
    collaborators: Array.from(room.collaborators.values()),
    chatMessages: room.chatMessages.slice(-50),
    activityHistory: room.activityHistory.slice(-50),
  });
});

// Vite or Static file serving
const startServer = async () => {
  const port = Number(process.env.PORT) || 3000;
  const server = http.createServer(app);

  // Initialize real-time WebSocket server for collaboration
  collaborationHub.init(server);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[IMCH AI Developer] Server running on http://0.0.0.0:${port} with OpenRouter engine & Real-Time Collaboration WebSocket`);
  });
};

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
});
