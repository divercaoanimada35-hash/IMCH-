# IMCH AI — Gerador de Sites em 2 Etapas (Planner & Coder)

Construção do gerador de sites inteligente **IMCH AI**, implementando o fluxo obrigatório em 2 etapas com **OpenRouter**: o **PLANNER** (que gera a especificação estrutural e a copy final palavra por palavra) e o **CODER** (chamadas individuais com JSON Schema restrito para cada arquivo), renderizando o resultado em preview interativo com `<iframe srcdoc>`.

---

## 1. Esquema do Banco de Dados & Armazenamento

> [!NOTE]
> **Esquema de Banco de Dados**: Não há necessidade de banco de dados relacional ou Cloud SQL persistente externo. O fluxo de geração é processado diretamente pelo backend via `POST /api/generate` (e streaming SSE `/api/generate/stream`) de forma stateless, com retenção do histórico e arquivos gerados no estado reativo do cliente e persistência local (`localStorage`).

---

## 2. Plano de Arquivos

```
/
├── server.ts                             # Servidor Express com endpoints do OpenRouter (Planner & Coder)
├── server/
│   ├── openRouterClient.ts              # Utilitário com chamadas strict JSON Schema, temperature e provider
│   └── siteGenerator.ts                 # Orquestrador em 2 etapas (Planner spec + Coder por arquivo + retry anti-lorem)
├── src/
│   ├── App.tsx                          # Interface principal do IMCH AI Site Generator
│   ├── index.css                        # Estilos Tailwind e animações de preview
│   ├── types/
│   │   └── generator.ts                 # Tipagens da SPEC, Arquivos, Erros e Status de Geração
│   ├── services/
│   │   └── generatorApi.ts              # Cliente HTTP/SSE para comunicação com /api/generate
│   ├── utils/
│   │   └── previewBundler.ts            # Montador de bundle HTML/CSS/JS para <iframe srcdoc>
│   └── components/
│       ├── Header.tsx                   # Cabeçalho com status da chave OpenRouter e seletor de modelos
│       ├── BriefingForm.tsx             # Textarea de briefing com tags literais e botão Gerar
│       ├── GenerationProgress.tsx       # Loading state em tempo real ("planejando…", "gerando index.html…")
│       ├── ErrorPanel.tsx               # Painel detalhado de erros com código HTTP e mensagem OpenRouter
│       ├── FileExplorer.tsx             # Lista de arquivos gerados com visualizador de código e download
│       ├── LivePreview.tsx              # Preview responsivo em iframe com srcdoc e alternância de viewport
│       └── SpecViewer.tsx               # Inspeção da paleta de cores, tipografia e seções da copy final
```

---

## 3. Fluxo de Execução Obrigatório (2 Etapas)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. Briefing do Usuário                          │
│     Usuário escreve o briefing no Textarea e clica em "Gerar"          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ POST /api/generate
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      2. Etapa 1: PLANNER                               │
│  • brief enviado estritamente entre tags literais <briefing>           │
│  • temperature: 0.3, max_tokens: 16000, provider: require_parameters   │
│  • response_format: json_schema com strict: true                        │
│  • Saída: SPEC com nome, idioma, paleta, fontes, arquivos e seções    │
│    com a COPY FINAL completa palavra por palavra                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Para cada arquivo da SPEC
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      3. Etapa 2: CODER                                 │
│  • Chamada SEPARADA para cada arquivo da lista da SPEC                 │
│  • temperature: 0.1, max_tokens: 16000, provider: require_parameters   │
│  • response_format: json_schema strict: true -> { path, content }      │
│  • Copy obrigatória: idêntica à da SPEC palavra por palavra           │
│  • Verificação anti-lorem: se contiver "lorem ipsum" ou "texto de      │
│    exemplo", refaz 1 vez; se persistir, emite aviso na resposta        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Devolve arquivos gerados
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      4. Preview & Inspeção Client                      │
│  • Renderização instantânea com <iframe srcdoc={bundledHtml}>          │
│  • Lista de arquivos gerados com visualização de código                │
│  • Se finish_reason === "length", erro visível com status na UI        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Regras e Validações Rígidas

1. **Zero Mock / Zero Templates Fixos**: Todo o conteúdo é gerado dinamicamente pela API do OpenRouter.
2. **Tags de Briefing**: O texto do briefing é injetado literalmente entre `<briefing>` e `</briefing>`.
3. **Parâmetros de Inferência**:
   - Planner: `temperature: 0.3`, `max_tokens: 16000`
   - Coder: `temperature: 0.1`, `max_tokens: 16000`
   - Ambas as chamadas: `provider: { require_parameters: true }` e `response_format: { type: "json_schema", json_schema: { strict: true, ... } }`.
4. **Tratamento de Limites e Erros**:
   - `finish_reason === "length"` dispara status HTTP `422 Unprocessable Entity` com mensagem visível destacando o estouro de tamanho.
   - Ausência de `OPENROUTER_API_KEY` dispara erro explícito HTTP `500` sem fallback silencioso.
5. **Anti-Lorem Ipsum**:
   - Scanner detecta "lorem ipsum", "texto de exemplo", "placeholder", etc.
   - Refaz a chamada do arquivo afetado até 1 vez; se persistir, exibe aviso amarelo visível na interface.
