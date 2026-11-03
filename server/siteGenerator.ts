/**
 * IMCH AI - Site Generator (2-Step Orchestrator)
 * 
 * Etapa 1: PLANNER (temperature: 0.3, max_tokens: 16000, provider: require_parameters, strict json_schema)
 *   -> Recebe o briefing literal entre tags <briefing> e devolve SPEC completa com copy final.
 * 
 * Etapa 2: CODER (temperature: 0.1, max_tokens: 16000, provider: require_parameters, strict json_schema)
 *   -> Chamada separada para CADA arquivo da SPEC com { path, content }.
 *   -> Valida finish_reason !== "length" (erro visível se estourar).
 *   -> Anti-lorem: se contiver "lorem ipsum" ou "texto de exemplo", refaz 1 vez; se persistir, adiciona aviso.
 *   -> Copy idêntica à da SPEC palavra por palavra.
 */

export interface SiteColorPalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export interface SiteFonts {
  heading: string;
  body: string;
}

export interface SiteSectionSpec {
  id: string;
  title: string;
  copy: string;
  details: string;
}

export interface SiteSpec {
  siteName: string;
  language: string;
  description: string;
  palette: SiteColorPalette;
  fonts: SiteFonts;
  files: string[];
  sections: SiteSectionSpec[];
}

export interface SiteGeneratorOptions {
  briefing: string;
  model?: string;
  apiKey: string;
  onStep?: (event: {
    step: 'planning' | 'coding' | 'file_done' | 'warning' | 'done';
    message: string;
    file?: string;
    fileIndex?: number;
    totalFiles?: number;
    percent?: number;
    spec?: SiteSpec;
    fileData?: { path: string; content: string };
  }) => void;
}

export interface SiteGeneratorResult {
  spec: SiteSpec;
  files: Record<string, string>;
  warnings: string[];
  durationMs: number;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Planner JSON Schema (strict mode required by OpenRouter)
const PLANNER_JSON_SCHEMA = {
  name: 'site_planner_spec',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      siteName: {
        type: 'string',
        description: 'Nome da marca, empresa ou produto do website.',
      },
      language: {
        type: 'string',
        description: 'Idioma do site (ex: pt-PT, pt-BR, en-US).',
      },
      description: {
        type: 'string',
        description: 'Resumo executivo do propósito e proposta de valor do website.',
      },
      palette: {
        type: 'object',
        properties: {
          primary: { type: 'string', description: 'Cor primária em formato hexadecimal (ex: #0066FF).' },
          secondary: { type: 'string', description: 'Cor secundária em formato hexadecimal.' },
          background: { type: 'string', description: 'Cor de fundo principal em formato hexadecimal.' },
          surface: { type: 'string', description: 'Cor de cartões ou superfícies em formato hexadecimal.' },
          text: { type: 'string', description: 'Cor de texto principal com alto contraste.' },
          accent: { type: 'string', description: 'Cor de destaque para botões de conversão e badges.' },
        },
        required: ['primary', 'secondary', 'background', 'surface', 'text', 'accent'],
        additionalProperties: false,
      },
      fonts: {
        type: 'object',
        properties: {
          heading: { type: 'string', description: 'Família tipográfica Google Fonts para títulos (ex: Inter, Plus Jakarta Sans, Outfit).' },
          body: { type: 'string', description: 'Família tipográfica Google Fonts para textos corridos.' },
        },
        required: ['heading', 'body'],
        additionalProperties: false,
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista exata de arquivos que compõem o website (sempre inclui index.html, styles.css, app.js).',
      },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Identificador semântico da seção (ex: hero, services, about, testimonials, contact, footer).' },
            title: { type: 'string', description: 'Título persuasivo e impactante da seção.' },
            copy: { type: 'string', description: 'O texto e copy FINAL e completa da seção, palavra por palavra. NUNCA usar placeholders ou lorem ipsum.' },
            details: { type: 'string', description: 'Instruções de layout, botões de ação e componentes específicos desta seção.' },
          },
          required: ['id', 'title', 'copy', 'details'],
          additionalProperties: false,
        },
        description: 'Todas as seções do site com a copy final exata palavra por palavra.',
      },
    },
    required: ['siteName', 'language', 'description', 'palette', 'fonts', 'files', 'sections'],
    additionalProperties: false,
  },
};

// Coder JSON Schema (strict mode required by OpenRouter)
const CODER_JSON_SCHEMA = {
  name: 'file_coder_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Caminho relativo do arquivo (ex: index.html, styles.css, app.js).',
      },
      content: {
        type: 'string',
        description: 'Código fonte completo, funcional e sem omissões do arquivo.',
      },
    },
    required: ['path', 'content'],
    additionalProperties: false,
  },
};

/**
 * Detecta expressões proibidas de texto genérico / placeholder
 */
function containsForbiddenPlaceholders(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('lorem ipsum') ||
    lower.includes('texto de exemplo') ||
    lower.includes('seu título aqui') ||
    lower.includes('placeholder text') ||
    lower.includes('insira seu texto')
  );
}

/**
 * Chamada individual padronizada à API do OpenRouter
 */
async function callOpenRouter(params: {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
  jsonSchema: { name: string; strict: boolean; schema: Record<string, any> };
}): Promise<{ content: string; finishReason: string; raw: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos timeout

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://imch.pt',
        'X-Title': 'IMCH AI Site Generator',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        provider: {
          require_parameters: true,
        },
        response_format: {
          type: 'json_schema',
          json_schema: params.jsonSchema,
        },
      }),
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        const errorJson = await response.json();
        errorBody = errorJson.error?.message || JSON.stringify(errorJson);
      } catch {
        errorBody = await response.text();
      }

      // Se a conta OpenRouter não possui créditos pagos (HTTP 402 Insufficient credits)
      if (response.status === 402) {
        if (params.model !== 'openrouter/free') {
          console.warn(`[OpenRouter HTTP 402] O modelo "${params.model}" requer créditos pagos. Alternando automaticamente para o modelo gratuito "openrouter/free"...`);
          return await callOpenRouter({
            ...params,
            model: 'openrouter/free',
          });
        }
        
        const friendlyMsg = 'A sua conta OpenRouter não possui créditos pagos (HTTP 402). Adicione saldo em https://openrouter.ai/settings/credits ou utilize o modelo gratuito "openrouter/free".';
        const err: any = new Error(friendlyMsg);
        err.status = 402;
        err.openRouterMessage = friendlyMsg;
        throw err;
      }

      const err: any = new Error(
        `OpenRouter HTTP ${response.status}: ${errorBody || response.statusText}`
      );
      err.status = response.status;
      err.openRouterMessage = errorBody;
      throw err;
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      const err: any = new Error('OpenRouter não retornou nenhuma escolha (choice) na resposta.');
      err.status = 502;
      throw err;
    }

    const finishReason = choice.finish_reason || 'stop';

    // Regra rígida: Se finish_reason === "length", disparar erro visível
    if (finishReason === 'length') {
      const err: any = new Error(
        'A geração do código excedeu o limite máximo de tokens permitidos (finish_reason === "length").'
      );
      err.status = 422;
      err.finishReason = 'length';
      err.openRouterMessage = 'Limite de tokens excedido (finish_reason: length). Reduza o escopo ou divida o site em mais arquivos.';
      throw err;
    }

    const messageContent = choice.message?.content;
    if (!messageContent || typeof messageContent !== 'string') {
      const err: any = new Error('Resposta do OpenRouter não contém conteúdo de mensagem válido.');
      err.status = 502;
      throw err;
    }

    return {
      content: messageContent,
      finishReason,
      raw: data,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Orquestrador principal em 2 Etapas do IMCH AI
 */
export async function generateSite(options: SiteGeneratorOptions): Promise<SiteGeneratorResult> {
  const startTime = Date.now();
  const { briefing, apiKey, onStep } = options;

  if (!apiKey || apiKey.trim().length === 0) {
    const err: any = new Error('Chave OPENROUTER_API_KEY não configurada no servidor.');
    err.status = 500;
    throw err;
  }

  if (!briefing || briefing.trim().length === 0) {
    const err: any = new Error('O briefing do website não pode estar vazio.');
    err.status = 400;
    throw err;
  }

  const rawModel = options.model && options.model.trim().length > 0 ? options.model.trim() : 'openrouter/free';
  const model = rawModel === 'openrouter/auto' ? 'openrouter/free' : rawModel;
  const warnings: string[] = [];

  // =========================================================================
  // ETAPA 1: PLANNER
  // Regras rígidas:
  // - brief DEVE ir literalmente, sem resumir, entre tags <briefing>.
  // - temperature: 0.3
  // - max_tokens: 16000
  // - provider: { require_parameters: true }
  // - response_format json_schema com strict: true
  // =========================================================================
  onStep?.({
    step: 'planning',
    message: 'Planejando arquitetura, paleta visual e copy final do website...',
    percent: 15,
  });

  const plannerMessages = [
    {
      role: 'system',
      content: `Tu és o PLANNER de sites e aplicações web da IMCH AI.
A tua responsabilidade é ler com atenção total o briefing do cliente e projetar a SPEC completa do website.

REGRAS RÍGIDAS DE PLANEJAMENTO:
1. Analisa os requisitos, proposta de valor, público-alvo e nicho comercial descritos no briefing.
2. Define a paleta de cores harmoniosa em hexadecimal (primária, secundária, fundo, superfície, texto e destaque).
3. Seleciona duas fontes tipográficas do Google Fonts modernas e adequadas à identidade da marca.
4. Lista os arquivos necessários para o website estático completo. DEVES incluir: "index.html", "styles.css" e "app.js". Se o projeto tiver mais páginas ou módulos, inclui arquivos adicionais como "sobre.html", etc.
5. Escreve para CADA seção a COPY FINAL COMPLETA palavra por palavra.
   - NUNCA uses "lorem ipsum", "texto de exemplo", "placeholder", "seu texto aqui" ou reticências.
   - Escreve textos persuasivos, títulos chamativos, parágrafos informativos, chamadas para ação (CTAs) e depoimentos ou diferenciais autênticos e detalhados.
6. A saída DEVE ser estritamente o objeto JSON em conformidade com o schema fornecido.`,
    },
    {
      role: 'user',
      // Briefing enviado literalmente, sem resumir, entre tags <briefing>
      content: `<briefing>${briefing}</briefing>`,
    },
  ];

  let spec: SiteSpec;
  try {
    const plannerResult = await callOpenRouter({
      apiKey,
      model,
      messages: plannerMessages,
      temperature: 0.3,
      maxTokens: 16000,
      jsonSchema: PLANNER_JSON_SCHEMA,
    });

    spec = JSON.parse(plannerResult.content);
  } catch (err: any) {
    if (err.status) throw err;
    const parseErr: any = new Error(`Falha ao processar a especificação do PLANNER: ${err.message}`);
    parseErr.status = 502;
    throw parseErr;
  }

  // Validação mínima da SPEC
  if (!spec.files || !Array.isArray(spec.files) || spec.files.length === 0) {
    spec.files = ['index.html', 'styles.css', 'app.js'];
  }
  if (!spec.files.includes('index.html')) {
    spec.files.unshift('index.html');
  }

  onStep?.({
    step: 'planning',
    message: `Plano concluído para "${spec.siteName}". Iniciando geração de ${spec.files.length} arquivos...`,
    spec,
    percent: 30,
  });

  // =========================================================================
  // ETAPA 2: CODER
  // Regras rígidas:
  // - Para CADA arquivo da SPEC, uma chamada separada.
  // - temperature: 0.1
  // - max_tokens: 16000
  // - provider: { require_parameters: true }
  // - response_format json_schema com strict: true -> { path, content }
  // - A copy do site DEVE ser exatamente a da SPEC, palavra por palavra.
  // - Se finish_reason === "length", dispare erro visível na UI.
  // - Se content contiver "lorem ipsum" / "texto de exemplo", refaça 1 vez, depois mostre aviso.
  // - NÃO gere site de exemplo ou template fixo.
  // =========================================================================
  const generatedFiles: Record<string, string> = {};
  const totalFiles = spec.files.length;

  for (let i = 0; i < totalFiles; i++) {
    const currentFilePath = spec.files[i];
    const fileIndex = i + 1;
    const currentPercent = Math.round(30 + (fileIndex / totalFiles) * 65);

    onStep?.({
      step: 'coding',
      message: `Gerando ${currentFilePath} (${fileIndex}/${totalFiles})…`,
      file: currentFilePath,
      fileIndex,
      totalFiles,
      percent: currentPercent,
    });

    const coderSystemPrompt = `Tu és o CODER mestre do IMCH AI. A tua função é codificar o arquivo "${currentFilePath}" exatamente de acordo com a SPEC de arquitetura aprovada.

ESPECIFICAÇÃO DO WEBSITE:
Nome: ${spec.siteName}
Idioma: ${spec.language}
Descrição: ${spec.description}
Paleta de Cores:
  - Primária: ${spec.palette.primary}
  - Secundária: ${spec.palette.secondary}
  - Fundo: ${spec.palette.background}
  - Superfície: ${spec.palette.surface}
  - Texto: ${spec.palette.text}
  - Destaque: ${spec.palette.accent}
Tipografia:
  - Títulos: Google Fonts "${spec.fonts.heading}"
  - Textos: Google Fonts "${spec.fonts.body}"

SEÇÕES E COPY FINAL (OBRIGATÓRIO USAR PALAVRA POR PALAVRA):
${spec.sections.map((sec, idx) => `
[Seção ${idx + 1} - ${sec.id}]
Título: ${sec.title}
Copy Final: ${sec.copy}
Instruções de Detalhes: ${sec.details}
`).join('\n')}

REGRAS DE CÓDIGO FUNDAMENTAIS:
1. Este arquivo é: "${currentFilePath}".
2. Se for index.html:
   - Estrutura HTML5 moderna e semântica com <!DOCTYPE html>, <html lang="${spec.language}">, <meta charset="UTF-8">, viewport responsivo e título "${spec.siteName}".
   - Importa as Google Fonts "${spec.fonts.heading}" e "${spec.fonts.body}" no <head>.
   - Liga o arquivo de estilos: <link rel="stylesheet" href="styles.css"> e carrega o script: <script src="app.js" defer></script>.
   - Inclui SVG inline de alta fidelidade para ícones ou ilustrações visuais elegantes (sem ícones quebrados).
   - OBRIGATÓRIO: A copy de cada seção DEVE ser exatamente a copy fornecida na SPEC acima, palavra por palavra.
3. Se for styles.css:
   - CSS moderno, polido e totalmente responsivo com mobile-first.
   - Aplica as variáveis CSS com a paleta exata: primary=${spec.palette.primary}, background=${spec.palette.background}, surface=${spec.palette.surface}, text=${spec.palette.text}, accent=${spec.palette.accent}.
   - Utiliza as fontes configuradas: headings=${spec.fonts.heading}, body=${spec.fonts.body}.
   - Efeitos modernos: cards com sombras suaves, gradientes sutis, botões com hover interactivo e animações CSS limpas.
4. Se for app.js:
   - JavaScript puro moderno (ES6+), funcional e interativo.
   - Gerencia menu mobile responsivo (hamburguer), scroll suave para âncoras, interações de botões (como envio simulado de formulários com toast de sucesso) e abas/accordions se houver.
5. PROIBIÇÕES RÍGIDAS:
   - É TOTALMENTE PROIBIDO usar "lorem ipsum", "texto de exemplo", "placeholder" ou omitir trechos com "...".
   - Cada arquivo deve ser entregue 100% completo, sem placeholders.`;

    const coderUserPrompt = `Gera o arquivo completo "${currentFilePath}" agora no formato JSON estrito { "path": "${currentFilePath}", "content": "..." }.`;

    let fileContent = '';
    let usedAttempt = 1;

    // Primeira tentativa
    const firstCall = await callOpenRouter({
      apiKey,
      model,
      messages: [
        { role: 'system', content: coderSystemPrompt },
        { role: 'user', content: coderUserPrompt },
      ],
      temperature: 0.1,
      maxTokens: 16000,
      jsonSchema: CODER_JSON_SCHEMA,
    });

    const parsedFirst = JSON.parse(firstCall.content);
    fileContent = parsedFirst.content;

    // Regra rígida: Se content contiver "lorem ipsum" / "texto de exemplo", refaça 1 vez, depois mostre aviso.
    if (containsForbiddenPlaceholders(fileContent)) {
      usedAttempt = 2;
      onStep?.({
        step: 'warning',
        message: `Marcador genérico detectado em ${currentFilePath}. Refazendo chamada do Coder (tentativa 2)...`,
        file: currentFilePath,
        fileIndex,
        totalFiles,
      });

      const retryMessages = [
        { role: 'system', content: coderSystemPrompt },
        { role: 'user', content: coderUserPrompt },
        {
          role: 'assistant',
          content: firstCall.content,
        },
        {
          role: 'user',
          content: `AVISO DE CORREÇÃO URGENTE: O arquivo gerado continha termos proibidos ("lorem ipsum" ou "texto de exemplo"). Refaz agora o arquivo "${currentFilePath}" usando ESTRITAMENTE a copy final detalhada na SPEC, palavra por palavra, sem nenhuma omissão ou placeholder.`,
        },
      ];

      try {
        const secondCall = await callOpenRouter({
          apiKey,
          model,
          messages: retryMessages,
          temperature: 0.1,
          maxTokens: 16000,
          jsonSchema: CODER_JSON_SCHEMA,
        });

        const parsedSecond = JSON.parse(secondCall.content);
        fileContent = parsedSecond.content;

        // Se ainda contiver marcadores após a segunda tentativa, registrar aviso para a UI
        if (containsForbiddenPlaceholders(fileContent)) {
          warnings.push(`O arquivo ${currentFilePath} gerou alguns trechos com texto genérico mesmo após a tentativa de correção.`);
        }
      } catch (retryErr: any) {
        // Se a segunda tentativa falhar na rede, manter o conteúdo da primeira mas registrar aviso
        warnings.push(`A tentativa de regeneração de ${currentFilePath} não pôde ser completada: ${retryErr.message}`);
      }
    }

    generatedFiles[currentFilePath] = fileContent;

    onStep?.({
      step: 'file_done',
      message: `Arquivo ${currentFilePath} concluído com sucesso.`,
      file: currentFilePath,
      fileIndex,
      totalFiles,
      fileData: { path: currentFilePath, content: fileContent },
      percent: currentPercent,
    });
  }

  const durationMs = Date.now() - startTime;

  onStep?.({
    step: 'done',
    message: `Website "${spec.siteName}" gerado com sucesso em ${(durationMs / 1000).toFixed(1)}s!`,
    spec,
    percent: 100,
  });

  return {
    spec,
    files: generatedFiles,
    warnings,
    durationMs,
  };
}
