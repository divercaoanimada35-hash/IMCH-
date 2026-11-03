import { ArchitecturePlanResult, PlannedFileNode } from '../types';

export interface DomainAnalysis {
  category: 'prototype' | 'institutional' | 'web-application' | 'enterprise';
  domain: 'clinic' | 'ecommerce' | 'hotel' | 'restaurant' | 'saas' | 'education' | 'general';
  isReact: boolean;
  needsBackend: boolean;
  needsDatabase: boolean;
  needsAuth: boolean;
  features: string[];
}

export class ProjectArchitectureEngine {
  /**
   * Analyzes prompt intent, domain, and classification
   */
  static analyzeDomain(prompt: string, explicitType?: string): DomainAnalysis {
    const text = prompt.toLowerCase();

    // Domain detection
    let domain: DomainAnalysis['domain'] = 'general';
    if (/cl[ií]nica|m[eé]dic|hospital|sa[uú]de|paciente|consulta|doutor/i.test(text)) {
      domain = 'clinic';
    } else if (/loja|ecommerce|e-commerce|produto|carrinho|checkout|venda|compra|varejo/i.test(text)) {
      domain = 'ecommerce';
    } else if (/hotel|pousada|reserva|quarto|hospedagem|check-in|h[oó]spede/i.test(text)) {
      domain = 'hotel';
    } else if (/padaria|restaurante|caf[eé]|pizzaria|card[aá]pio|lanche|comida/i.test(text)) {
      domain = 'restaurant';
    } else if (/curso|escola|aluno|aula|educa|professor|plataforma de ensino/i.test(text)) {
      domain = 'education';
    } else if (/saas|dashboard|gest[aã]o|crm|erp|financeiro|m[eé]trica|painel/i.test(text)) {
      domain = 'saas';
    }

    // Category classification
    let category: DomainAnalysis['category'] = 'web-application';
    if (/enterprise|corporativ|multi-tenant|erp|complex|b2b/i.test(text)) {
      category = 'enterprise';
    } else if (/prot[oó]tipo|simples|widget|calculadora|contador|teste rápido/i.test(text)) {
      category = 'prototype';
    } else if (/institucional|landing|p[aá]gina de captura|one page|portf[oó]lio/i.test(text)) {
      category = 'institutional';
    }

    // React or Vanilla Stack
    const isReact = /react|jsx|componente|next/i.test(text) || category !== 'prototype';
    const needsBackend = category === 'web-application' || category === 'enterprise' || /backend|api|servidor|base de dados|sql/i.test(text);
    const needsDatabase = needsBackend || /persist|banco|base de dados|armazen/i.test(text);
    const needsAuth = category === 'enterprise' || /login|auth|autentica|usu[aá]rio|senha/i.test(text);

    // Feature discovery
    const featuresMap: Record<DomainAnalysis['domain'], string[]> = {
      clinic: ['pacientes', 'consultas', 'medicos', 'servicos', 'notificacoes', 'administracao'],
      ecommerce: ['produtos', 'carrinho', 'checkout', 'encomendas', 'clientes', 'estoque'],
      hotel: ['quartos', 'disponibilidade', 'reservas', 'hospedes', 'pagamentos', 'servicos'],
      restaurant: ['cardapio', 'pedidos', 'mesas', 'entregas', 'avaliacoes', 'contato'],
      saas: ['autenticacao', 'dashboard', 'assinaturas', 'metricas', 'configuracoes', 'integracoes'],
      education: ['cursos', 'aulas', 'estudantes', 'matriculas', 'certificados', 'progresso'],
      general: ['apresentacao', 'servicos', 'galeria', 'depoimentos', 'contacto', 'faq'],
    };

    const features = featuresMap[domain] || featuresMap.general;

    return {
      category,
      domain,
      isReact,
      needsBackend,
      needsDatabase,
      needsAuth,
      features,
    };
  }

  /**
   * Plans the architectural blueprint: folder tree, files, dependencies, implementation sequence
   */
  static planArchitecture(prompt: string, projectType?: string): ArchitecturePlanResult {
    const analysis = this.analyzeDomain(prompt, projectType);
    const cleanTitle = prompt
      .replace(/(?:cria|criar|gerar|desenvolve|desenvolver|faz|fazer|um|uma|site|website|página|plataforma|para)\s+/gi, '')
      .trim();

    const projectName = cleanTitle
      ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1, 38)
      : `Plataforma ${analysis.domain.toUpperCase()}`;

    const plannedDirectories: string[] = [
      'public/images',
      'public/icons',
      'src/components/ui',
      'src/components/layout',
      'src/components/shared',
      'src/services/api',
      'src/services/storage',
      'src/types',
      'src/utils',
      'src/styles',
    ];

    // Feature-driven directories
    analysis.features.forEach((feat) => {
      plannedDirectories.push(`src/features/${feat}`);
    });

    if (analysis.needsBackend) {
      plannedDirectories.push(
        'server/routes',
        'server/controllers',
        'server/services',
        'server/middleware',
        'database/schema',
        'database/seeds'
      );
    }

    plannedDirectories.push('tests/unit', 'docs');

    // Build planned file tree blueprint
    const fileTree: PlannedFileNode[] = [
      {
        path: 'index.html',
        description: 'Ponto de entrada HTML5 com montagem da SPA, Tailwind CSS e fontes tipográficas',
        layer: 'frontend',
      },
      {
        path: 'src/main.jsx',
        description: 'Bootstrap da aplicação React e inicialização dos provedores de contexto',
        layer: 'frontend',
      },
      {
        path: 'src/App.jsx',
        description: 'Componente mestre com layout responsivo, navegação de módulos e estado global',
        layer: 'frontend',
      },
      {
        path: 'src/types/index.ts',
        description: 'Contratos de dados e modelos TypeScript compartilhados entre frontend e serviços',
        layer: 'frontend',
      },
      {
        path: 'src/styles/index.css',
        description: 'Estilos globais, variáveis de tema e animações de transição',
        layer: 'frontend',
      },
      {
        path: 'src/services/api/apiClient.js',
        description: 'Cliente HTTP centralizado com tratamento de erros, interceptores e cache',
        layer: 'service',
      },
      {
        path: 'src/services/storage/localStore.js',
        description: 'Camada de persistência local resiliente e adaptadores de armazenamento',
        layer: 'service',
      },
    ];

    // Add feature components & services
    analysis.features.forEach((feat) => {
      fileTree.push({
        path: `src/features/${feat}/${feat.charAt(0).toUpperCase() + feat.slice(1)}Module.jsx`,
        description: `Módulo e visualização funcional para gestão de ${feat}`,
        layer: 'frontend',
      });
      fileTree.push({
        path: `src/features/${feat}/${feat}Service.js`,
        description: `Serviço de lógica de negócio e operações de dados para ${feat}`,
        layer: 'service',
      });
    });

    // Add server & database layers if fullstack
    if (analysis.needsBackend) {
      fileTree.push(
        {
          path: 'server/routes/api.js',
          description: 'Definição das rotas RESTful da API backend',
          layer: 'server',
        },
        {
          path: 'server/controllers/appController.js',
          description: 'Controladores de requisição com validação de payload e tratamento de status',
          layer: 'server',
        },
        {
          path: 'database/schema/schema.sql',
          description: 'Esquema relacional de tabelas, índices e restrições de integridade',
          layer: 'database',
        },
        {
          path: 'database/seeds/initialData.json',
          description: 'Dados iniciais para povoamento e arranque do sistema',
          layer: 'database',
        }
      );
    }

    // Config, tests & documentation
    fileTree.push(
      {
        path: 'tests/unit/app.test.js',
        description: 'Testes unitários automatizados para regras de negócio e serviços',
        layer: 'frontend',
      },
      {
        path: 'package.json',
        description: 'Manifesto de dependências, scripts de build, teste e execução',
        layer: 'config',
      },
      {
        path: '.env.example',
        description: 'Template de variáveis de ambiente sem credenciais confidenciais',
        layer: 'config',
      },
      {
        path: 'README.md',
        description: 'Documentação técnica de arquitetura, rotas, comandos e especificações',
        layer: 'doc',
      }
    );

    // Dependencies
    const dependencies = [
      { name: 'react', version: '^18.3.1', purpose: 'Framework reativo de interface' },
      { name: 'react-dom', version: '^18.3.1', purpose: 'Renderizador web para DOM' },
      { name: 'lucide-react', version: '^0.344.0', purpose: 'Biblioteca de ícones de alta fidelidade' },
      { name: 'tailwindcss', version: '^4.0.0', purpose: 'Framework de estilização utilitária' },
    ];

    if (analysis.needsBackend) {
      dependencies.push(
        { name: 'express', version: '^4.19.2', purpose: 'Servidor HTTP e rotas RESTful' },
        { name: 'cors', version: '^2.8.5', purpose: 'Controle de acesso entre origens' },
        { name: 'dotenv', version: '^16.4.5', purpose: 'Gestão de variáveis de ambiente' }
      );
    }

    // Implementation order
    const implementationOrder = [
      '1. Arquitetura e Contratos de Dados (src/types/index.ts)',
      '2. Camada de Infraestrutura e Serviços (src/services/api, storage)',
      '3. Módulos de Domínio (src/features/*)',
      '4. Composição da Aplicação e Navegação (src/App.jsx, main.jsx)',
      '5. Camada de Backend e Base de Dados (server/*, database/*)',
      '6. Testes Unitários e Documentação (tests/*, README.md)',
    ];

    return {
      projectName,
      projectCategory: analysis.category,
      description: `Projeto ${analysis.category} para ${analysis.domain} estruturado com arquitetura orientada a funcionalidades`,
      stack: analysis.needsBackend ? 'fullstack' : 'react',
      features: analysis.features,
      plannedDirectories,
      fileTree,
      dependencies,
      implementationOrder,
    };
  }
}
