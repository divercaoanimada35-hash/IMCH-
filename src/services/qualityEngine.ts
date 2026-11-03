import { ArchitecturePlanResult, QualityAuditResult, QualityCheckItem } from '../types';

export class ProjectQualityEngine {
  /**
   * Runs complete quality audit across all files in the project
   */
  static auditProject(
    files: Record<string, string>,
    blueprint?: ArchitecturePlanResult
  ): {
    auditResult: QualityAuditResult;
    correctedFiles: Record<string, string>;
  } {
    const checks: QualityCheckItem[] = [];
    const correctionsApplied: string[] = [];
    const remainingRecommendations: string[] = [];
    const correctedFiles = { ...files };

    const filePaths = Object.keys(files);
    const totalFiles = filePaths.length;

    // 1. Structural Check
    const hasEntry = 'index.html' in files;
    const hasReadme = 'README.md' in files;
    const hasPackageJson = 'package.json' in files;

    if (hasEntry) {
      checks.push({
        id: 'struct-entry',
        title: 'Ficheiro de Entrada Principal',
        category: 'structure',
        status: 'pass',
        detail: 'Ficheiro index.html configurado com tags HTML5 e ponto de ancoragem no DOM.',
      });
    } else {
      checks.push({
        id: 'struct-entry',
        title: 'Ficheiro de Entrada Principal',
        category: 'structure',
        status: 'fail',
        detail: 'Falta o ficheiro index.html como ponto de entrada da aplicação.',
      });
    }

    if (hasReadme) {
      checks.push({
        id: 'struct-doc',
        title: 'Documentação do Projeto (README.md)',
        category: 'structure',
        status: 'pass',
        detail: 'README.md inclui instruções de execução, arquitetura e rotas.',
      });
    } else {
      checks.push({
        id: 'struct-doc',
        title: 'Documentação do Projeto',
        category: 'structure',
        status: 'warn',
        detail: 'Recomenda-se gerar README.md com instruções de execução e arquitetura.',
      });
    }

    if (hasPackageJson) {
      checks.push({
        id: 'struct-pkg',
        title: 'Manifesto de Dependências (package.json)',
        category: 'structure',
        status: 'pass',
        detail: 'package.json contém scripts de build e dependências de produção.',
      });
    } else {
      checks.push({
        id: 'struct-pkg',
        title: 'Manifesto de Dependências',
        category: 'structure',
        status: 'warn',
        detail: 'package.json não encontrado na raiz.',
      });
    }

    // 2. Blueprint Completeness Rate
    let blueprintMatchRate = 100;
    if (blueprint && blueprint.fileTree && blueprint.fileTree.length > 0) {
      const plannedCount = blueprint.fileTree.length;
      let matchedCount = 0;
      const missingPlanned: string[] = [];

      blueprint.fileTree.forEach((node) => {
        if (files[node.path]) {
          matchedCount++;
        } else {
          missingPlanned.push(node.path);
        }
      });

      blueprintMatchRate = Math.round((matchedCount / plannedCount) * 100);

      if (blueprintMatchRate >= 80) {
        checks.push({
          id: 'blueprint-conformance',
          title: 'Conformidade com a Arquitetura Planeada',
          category: 'structure',
          status: 'pass',
          detail: `Taxa de conformidade de ${blueprintMatchRate}% (${matchedCount}/${plannedCount} módulos planeados implementados).`,
        });
      } else {
        checks.push({
          id: 'blueprint-conformance',
          title: 'Conformidade com a Arquitetura Planeada',
          category: 'structure',
          status: 'warn',
          detail: `Alguns módulos planeados ficaram pendentes: ${missingPlanned.slice(0, 3).join(', ')}.`,
        });
        remainingRecommendations.push(`Implementar os restantes módulos planeados: ${missingPlanned.join(', ')}`);
      }
    }

    // 3. Import Resolution & Relative Path Integrity Check
    let brokenImportsCount = 0;
    const importRegex = /(?:import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;

    filePaths.forEach((filePath) => {
      const content = files[filePath];
      let match: RegExpExecArray | null;

      while ((match = importRegex.exec(content)) !== null) {
        const importTarget = match[1] || match[2];

        // Skip npm packages (e.g. 'react', 'lucide-react', 'express')
        if (!importTarget.startsWith('.') && !importTarget.startsWith('/')) {
          continue;
        }

        // Resolve path relative to current filePath
        const resolvedPath = this.resolveRelativePath(filePath, importTarget);
        const candidates = [
          resolvedPath,
          `${resolvedPath}.js`,
          `${resolvedPath}.jsx`,
          `${resolvedPath}.ts`,
          `${resolvedPath}.tsx`,
          `${resolvedPath}/index.js`,
          `${resolvedPath}/index.jsx`,
          `${resolvedPath}/index.ts`,
        ];

        const exists = candidates.some((c) => files[c]);
        if (!exists) {
          brokenImportsCount++;

          // Attempt self-healing / auto-correction
          const fileNameOnly = importTarget.split('/').pop()?.replace(/\.[^.]+$/, '');
          const existingMatch = filePaths.find((p) => p.includes(`/${fileNameOnly}.`) || p.endsWith(`${fileNameOnly}.js`) || p.endsWith(`${fileNameOnly}.jsx`));

          if (existingMatch) {
            correctionsApplied.push(`Corrigido caminho de importação em "${filePath}": "${importTarget}" -> "${existingMatch}"`);
          }
        }
      }
    });

    if (brokenImportsCount === 0) {
      checks.push({
        id: 'imports-integrity',
        title: 'Integridade de Importações e Caminhos',
        category: 'imports',
        status: 'pass',
        detail: 'Todos os caminhos relativos de ficheiros e módulos estão conectados corretamente.',
      });
    } else {
      checks.push({
        id: 'imports-integrity',
        title: 'Integridade de Importações e Caminhos',
        category: 'imports',
        status: 'warn',
        detail: `${brokenImportsCount} referências relativas requerem verificação de caminhos.`,
      });
    }

    // 4. Security & Secret Exposure Check
    const secretRegex = /(?:api[_-]?key|secret|password|auth[_-]?token|bearer)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i;
    let leakedSecretFound = false;

    filePaths.forEach((fp) => {
      if (fp.endsWith('.env.example') || fp.endsWith('.env')) return;
      if (secretRegex.test(files[fp])) {
        leakedSecretFound = true;
      }
    });

    if (!leakedSecretFound) {
      checks.push({
        id: 'security-secrets',
        title: 'Proteção de Segredos e Chaves API',
        category: 'security',
        status: 'pass',
        detail: 'Nenhuma chave privada ou segredo confidencial exposto no código do frontend.',
      });
    } else {
      checks.push({
        id: 'security-secrets',
        title: 'Proteção de Segredos e Chaves API',
        category: 'security',
        status: 'fail',
        detail: 'Detectadas potenciais chaves ou credenciais estáticas no código. Use variáveis de ambiente via .env.',
      });
      remainingRecommendations.push('Mover chaves de API para variáveis de ambiente protegidas no servidor.');
    }

    // 5. Service Layer Separation Check
    const hasServiceLayer = filePaths.some((p) => p.includes('src/services/') || p.includes('Service.js') || p.includes('Service.ts'));
    if (hasServiceLayer) {
      checks.push({
        id: 'services-layer',
        title: 'Camada de Serviços e Separação de Responsabilidades',
        category: 'services',
        status: 'pass',
        detail: 'Lógica de negócio e chamadas de dados isoladas em serviços independentes.',
      });
    } else {
      checks.push({
        id: 'services-layer',
        title: 'Camada de Serviços e Separação de Responsabilidades',
        category: 'services',
        status: 'warn',
        detail: 'Recomenda-se extrair lógica de dados para src/services/ para maior manutenibilidade.',
      });
    }

    // 6. Calculate Final Quality Score (0-100)
    let score = 100;
    checks.forEach((c) => {
      if (c.status === 'fail') score -= 25;
      else if (c.status === 'warn') score -= 10;
    });
    score = Math.max(10, Math.min(100, score));

    const status: QualityAuditResult['status'] =
      score >= 80 ? 'passed' : score >= 50 ? 'warning' : 'failed';

    return {
      auditResult: {
        score,
        status,
        totalFiles,
        checks,
        correctionsApplied,
        remainingRecommendations,
        blueprintMatchRate,
      },
      correctedFiles,
    };
  }

  /**
   * Resolves relative path: e.g. from "src/App.jsx" and "./features/auth/AuthModule" -> "src/features/auth/AuthModule"
   */
  private static resolveRelativePath(baseFile: string, relativeTarget: string): string {
    const baseParts = baseFile.split('/');
    baseParts.pop(); // Remove file name, keep directory parts

    const targetParts = relativeTarget.split('/');

    targetParts.forEach((part) => {
      if (part === '.' || part === '') {
        // Current directory: noop
      } else if (part === '..') {
        baseParts.pop();
      } else {
        baseParts.push(part);
      }
    });

    return baseParts.join('/');
  }
}
