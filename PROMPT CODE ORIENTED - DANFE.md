PROMPT CODE-ORIENTED: SISTEMA DE ALOCAÇÃO DE CARGAS EM CONTAINERS COM EXPORTAÇÃO DANFE
Implementação Autônoma para CargoDeck-PRO
01 de maio de 2026

ÍNDICE AUTOMÁTICO
1.	Visão Executiva
2.	Arquitetura Técnica Geral
3.	Especificação Detalhada das 15 Colunas DANFE
4.	Especificação Técnica - Tipos TypeScript
5.	Fluxo de Criação do Container
6.	Fluxo de Alocação de Cargas - Entrada Manual via Grid
7.	Fluxo de Alocação de Cargas - Extração via PDF DANFE
8.	Fluxo de Visualização - Pop-up do Container
9.	Fluxo de Deleção de Cargas
10.	Fluxo de Seleção e Exportação PDF Múltiplo
11.	Especificação do Arquivo PDF Exportado
12.	Integração com Supabase
13.	Integração com Zustand Store
14.	Validações e Regras de Negócio
15.	Instruções para o Claude Code (Prompt Copyable)
16.	Timeline e Fases de Implementação
17.	Troubleshooting e Edge Cases
18.	Referências Externas

1. VISÃO EXECUTIVA
O objetivo deste projeto é implementar um sistema robusto de conteinerização dentro do ecossistema CargoDeck-PRO. O sistema permitirá que operadores logísticos criem unidades de transporte (containers, cestas, skids) e aloquem cargas físicas dentro delas. A entrada de dados será híbrida: via preenchimento manual em grid estilo Excel ou via extração inteligente de arquivos PDF DANFE (Documento Auxiliar da Nota Fiscal Eletrônica). O resultado final é a capacidade de visualizar o inventário de cada container em pop-ups interativos e exportar relatórios PDF estruturados em árvore, onde containers figuram como pastas e cargas como subpastas, mantendo a fidelidade total às 15 colunas regulatórias do DANFE.
2. ARQUITETURA TÉCNICA GERAL
A implementação baseia-se em sete pilares modulares:
2.1. ContainerModal: Componente de interface para criação e edição de metadados das unidades de transporte.
2.2. ContainerGrid: Visualização principal na página de Geração Modal, listando as unidades criadas com suporte a seleção múltipla.
2.3. CargoAllocationPopup: Interface de alta densidade de dados que utiliza um grid estilo spreadsheet para gerenciar o conteúdo interno de cada container.
2.4. DANFEExporter: Motor de geração de documentos PDF que processa a hierarquia de dados para o formato de relatório.
2.5. PDFTreeGenerator: Lógica de estruturação visual que transforma a relação Pai-Filho (Container-Carga) em uma representação de diretórios no PDF.
2.6. ContainerStore (Zustand): Gerenciador de estado global para persistência otimizada e reatividade da UI.
2.7. CargoExtractionEngine: Orquestrador que utiliza pdfjs-dist para leitura de texto e Open Code Zen API para parsing semântico via LLM.
3. ESPECIFICAÇÃO DETALHADA DAS 15 COLUNAS DANFE
Cada item de carga deve obrigatoriamente suportar os seguintes campos extraídos ou inseridos:
01. COD.PROD.: String. Identificador único do produto. Validação: Obrigatório. Máximo 20 caracteres. Ex: "MTR-9982".
02. DESCRIÇÃO DO PRODUTO / SERVIÇO: String. Nome detalhado. Validação: Obrigatório. Máximo 500 caracteres. Ex: "VÁLVULA DE ESFERA 2 POLEGADAS INOX".
03. NCM/SH: String. Nomenclatura Comum do Mercosul. Validação: 8 dígitos numéricos. Ex: "84818095".
04. CST: String. Código de Situação Tributária. Validação: 3 dígitos. Ex: "000".
05. CFOP: String. Código Fiscal de Operações e Prestações. Validação: 4 dígitos. Ex: "5102".
06. UNID: String. Unidade de medida. Validação: Máximo 6 caracteres. Ex: "UN", "PC", "KG".
07. QTDE: Number. Quantidade física. Validação: Positivo, até 4 casas decimais. Ex: 10,0000.
08. VL. UNITÁRIO: Number. Valor por unidade. Validação: Positivo. Máximo 15 dígitos. Ex: 150,50.
09. VL. TOTAL: Number. Resultado de QTDE * VL. UNITÁRIO. Validação: Automático. Ex: 1505,00.
10. VL. DESCONTO: Number. Valor abatido. Validação: Opcional. Ex: 0,00.
11. BC. ICMS: Number. Base de cálculo do ICMS. Validação: Numérico. Ex: 1505,00.
12. VL. ICMS: Number. Valor do imposto ICMS. Validação: Numérico. Ex: 180,60.
13. V. IPI: Number. Valor do imposto IPI. Validação: Numérico. Ex: 0,00.
14. ALÍQ. ICMS: Number. Percentual ICMS. Validação: 0 a 100. Ex: 12,00.
15. ALÍQ. IPI: Number. Percentual IPI. Validação: 0 a 100. Ex: 5,00.
4. ESPECIFICAÇÃO TÉCNICA - TIPOS TYPESCRIPT
As interfaces devem ser rigorosamente tipadas para evitar inconsistências:
export enum ContainerType {   CONTAINER = 'container',   CESTA = 'cesta',   SKID = 'skid',   CAIXA = 'caixa',   OUTRO = 'outro' }  export interface Container {   id: string;<br/>   name: string;<br/>   type: ContainerType;<br/>   createdDate: string;<br/>   updatedDate: string;<br/>   status: 'Ativo' | 'Inativo';<br/>   userId: string; }  export interface CargoItem {   id: string;<br/>   containerId: string;<br/>   codProd: string;<br/>   descricao: string;<br/>   ncmsh: string;<br/>   cst: string;<br/>   cfop: string;<br/>   unid: string;<br/>   qtde: number;<br/>   vlUnitario: number;<br/>   vlTotal: number;<br/>   vlDesconto: number;<br/>   bcIcms: number;<br/>   vlIcms: number;<br/>   vlIpi: number;<br/>   aliqIcms: number;<br/>   aliqIpi: number;<br/>   userId: string; }  export interface ContainerWithContents extends Container {   items: CargoItem[]; }
5. FLUXO DE CRIAÇÃO DO CONTAINER
O processo inicia na página "Geração Modal de Transporte":
19.	O usuário aciona o botão "Novo Container".
20.	O ContainerModal é renderizado com campos: Nome (Input), Tipo (Select: Container, Cesta, Skid, Caixa, Outro) e Status (Toggle).
21.	Validação em tempo real: O campo "Nome" é obrigatório e deve ser único para o usuário.
22.	Ao salvar, o sistema dispara a action addContainer no Zustand.
23.	A persistência ocorre simultaneamente na tabela containers do Supabase.
24.	A UI atualiza o grid principal inserindo o novo card/linha de container.
6. FLUXO DE ALOCAÇÃO DE CARGAS - ENTRADA MANUAL VIA GRID
Para inserção manual de itens:
25.	O usuário clica em um container existente no grid.
26.	O CargoAllocationPopup abre, carregando o componente de grid estilo Excel.
27.	O usuário pode clicar em "Adicionar Linha" para abrir uma nova entrada em branco.
28.	O preenchimento das 15 colunas é feito diretamente nas células.
29.	Máscaras de formatação brasileira (R$ 0.000,00) são aplicadas em campos monetários.
30.	Ao confirmar a linha, o item é vinculado ao containerId e salvo na tabela cargo_items.
7. FLUXO DE ALOCAÇÃO DE CARGAS - EXTRAÇÃO VIA PDF DANFE
Para automação via nota fiscal:
31.	Dentro do pop-up de alocação, o usuário seleciona "Importar de PDF DANFE".
32.	O arquivo é processado localmente pelo pdfjs-dist para extração de strings brutas.
33.	O texto é enviado para a Open Code Zen API (Modelo MiniMax M2.5) com o prompt: "Extraia a tabela de DADOS DO PRODUTO / SERVIÇO deste DANFE e retorne um JSON array com as 15 colunas especificadas".
34.	O sistema recebe o JSON e popula o grid temporário para revisão do usuário.
35.	O usuário valida os dados e clica em "Confirmar Importação", persistindo os itens no banco de dados vinculados ao container atual.
8. FLUXO DE VISUALIZAÇÃO - POP-UP DO CONTAINER
A visualização de inventário foca na clareza:
36.	Ao selecionar um container, o pop-up exibe um grid com scroll horizontal.
37.	Colunas visíveis por padrão: COD.PROD., DESCRIÇÃO, UNID, QTDE, VL. UNITÁRIO, VL. TOTAL, DESCONTO, ICMS, IPI, ALÍQ. ICMS, ALÍQ. IPI.
38.	A última coluna contém ações rápidas (Editar/Excluir).
39.	O rodapé do pop-up exibe botões de ação em massa e o botão de exportação individual de PDF.
9. FLUXO DE DELEÇÃO DE CARGAS
Gerenciamento de erros e remoção:
40.	O usuário seleciona itens via checkbox no grid do container.
41.	Clica em "Deletar Selecionadas".
42.	Um modal de confirmação exibe: "Tem certeza que deseja deletar [N] carga(s) do container [NOME]?".
43.	Após o "Sim", o Zustand remove os itens do estado local e envia o comando de delete para o Supabase filtrando por IDs.
44.	O grid é atualizado instantaneamente via reatividade do estado.
10. FLUXO DE SELEÇÃO E EXPORTAÇÃO PDF MÚLTIPLO
Geração de relatórios consolidados:
45.	Na página principal, o usuário marca múltiplos containers via checkbox.
46.	O botão flutuante "Gerar PDF Selecionados" torna-se ativo.
47.	O sistema compila todos os containers e seus respectivos cargo_items.
48.	O motor de PDF gera um único documento onde cada container inicia uma nova seção.
49.	O download é iniciado com o nome padronizado: Containers_DDMMAAAA_HHMM.pdf.
11. ESPECIFICAÇÃO DO ARQUIVO PDF EXPORTADO
O documento deve seguir o padrão visual Dark Industrial:

●	Capa: Fundo cinza escuro, logo CargoDeck-PRO, título do relatório, data/hora e resumo numérico.
●	Sumário: Lista clicável de containers incluídos.
●	Estrutura de Pastas (Visual): Cada container é precedido por um ícone de pasta e seu nome em destaque.
●	Tabelas de Itens: Fundo alternado para leitura, cabeçalho fixo com as 15 colunas.
●	Rodapé de Container: Totalizadores de quantidade e valor total daquela unidade.
●	Resumo Final: Valor total de todas as notas fiscais alocadas e peso total estimado.
12. INTEGRAÇÃO COM SUPABASE
Estrutura de dados relacional:
Tabela: containers

●	id: uuid (primary key)
●	name: text (not null)
●	type: text (check: container, cesta, skid, caixa, outro)
●	status: text (default: 'Ativo')
●	created_at: timestamp with time zone
●	user_id: uuid (foreign key para auth.users)
Tabela: cargo_items

●	id: uuid (primary key)
●	container_id: uuid (foreign key para containers, on delete cascade)
●	cod_prod, descricao, ncm_sh, cst, cfop, unid: text
●	qtde, vl_unitario, vl_total, vl_desconto, bc_icms, vl_icms, vl_ipi, aliq_icms, aliq_ipi: numeric
●	user_id: uuid (foreign key para auth.users)
RLS (Row Level Security):
●	Políticas de SELECT, INSERT, UPDATE e DELETE habilitadas apenas onde user_id = auth.uid().
13. INTEGRAÇÃO COM ZUSTAND STORE
Definição do containerStore:
state: {<br/>   containers: [],<br/>   cargoItems: [],<br/>   selectedContainerId: null,<br/>   loading: false,<br/>   error: null }  actions: {<br/>   fetchData: () => Carrega containers e itens do Supabase.<br/>   addContainer: (data) => Insere no DB e atualiza estado.<br/>   deleteContainer: (id) => Remove do DB e estado.<br/>   addCargoItems: (items) => Insere múltiplos itens vinculados a um container.<br/>   updateCargoItem: (id, updates) => Atualiza item específico.<br/>   removeCargoItems: (ids) => Deleção em lote. }
14. VALIDAÇÕES E REGRAS DE NEGÓCIO
50.	Integridade Numérica: QTDE e VL. UNITÁRIO não podem ser negativos.
51.	Cálculo Automático: VL. TOTAL deve ser sempre recalculado como (QTDE * VL. UNITÁRIO) - VL. DESCONTO.
52.	Máscaras: NCM/SH deve ter 8 dígitos; CFOP deve ter 4 dígitos.
53.	Unicidade: Não permitir dois itens com o mesmo COD.PROD dentro do mesmo container (aviso ao usuário).
54.	Sanitização: Descrições de produtos devem ser limpas de caracteres especiais que quebrem a geração do PDF.
15. INSTRUÇÕES PARA O CLAUDE CODE (PROMPT COPYABLE)
Atue como um Desenvolvedor Full Stack Sênior para implementar a funcionalidade de Alocação de Cargas em Containers no projeto CargoDeck-PRO. Siga estas diretrizes estritas:
55.	Analise os arquivos UnallocatedCargoPage.tsx e cargoStore.ts para entender o contexto atual de gerenciamento de cargas.
56.	Crie as tabelas 'containers' e 'cargo_items' no Supabase seguindo a especificação da Seção 12, incluindo RLS.
57.	Implemente o containerStore.ts usando Zustand para gerenciar o estado das unidades e seus itens, garantindo sincronização em tempo real com o banco de dados.
58.	Desenvolva o ContainerModal e o CargoAllocationPopup utilizando Tailwind CSS para manter o tema Dark Industrial (#1a1a2e).
59.	No CargoAllocationPopup, integre um grid estilo Excel que suporte edição inline das 15 colunas DANFE.
60.	Implemente a lógica de extração de PDF: use pdfjs-dist para ler o texto e envie para a Open Code Zen API (Modelo MiniMax M2.5) para converter o texto bruto em um array JSON de objetos CargoItem.
61.	Desenvolva o motor de exportação PDF usando jsPDF ou pdfmake. O PDF deve ter uma estrutura de árvore (Container > Itens) e seguir o design Dark Industrial especificado na Seção 11.
62.	Garanta que todas as validações da Seção 14 sejam aplicadas tanto no frontend quanto nas chamadas de API.
63.	Use TypeScript estrito em todos os novos arquivos, definindo interfaces claras e evitando o uso de 'any'.
64.	Implemente tratamento de erros para falhas de rede, erros de parsing de PDF e falhas na API de LLM, exibindo toasts informativos ao usuário.
65.	Certifique-se de que a responsividade seja mantida, permitindo a visualização dos grids em tablets e desktops de forma otimizada.
66.	Realize commits semânticos e documente funções complexas com TSDoc.
16. TIMELINE E FASES DE IMPLEMENTAÇÃO
Fase 1: Foundation & Types (4h)
●	Criação de tabelas no Supabase e RLS.
●	Definição de interfaces TypeScript.
●	Setup inicial do Zustand store.
Fase 2: UI de Containers (8h)
●	Implementação do ContainerGrid na página principal.
●	Criação do ContainerModal (CRUD de unidades).
●	Estilização Dark Industrial.
Fase 3: Lógica de Alocação & Grid (10h)
●	Desenvolvimento do CargoAllocationPopup.
●	Integração do grid editável com 15 colunas.
●	Lógica de persistência de itens vinculados.
Fase 4: Extração Inteligente & PDF (6h)
●	Integração com pdfjs-dist e Open Code Zen API.
●	Desenvolvimento do template de exportação PDF estruturado.
Fase 5: QA & Polimento (6h)
●	Testes de regressão.
●	Validação de performance com grandes volumes de dados.
●	Deploy e verificação em ambiente de staging.
17. TROUBLESHOOTING E EDGE CASES
67.	PDFs Protegidos: Se o PDF tiver senha ou restrição de leitura, exibir erro claro solicitando arquivo desbloqueado.
68.	Parsing LLM Incorreto: Se a IA retornar JSON inválido, o sistema deve permitir que o usuário cole o texto manualmente ou tente novamente.
69.	Concorrência: Se dois usuários editarem o mesmo container, usar o timestamp updated_at para resolver conflitos (Last Write Wins).
70.	Performance do PDF: Para mais de 50 containers, gerar o PDF em chunks ou usar Web Workers para não travar a UI.
71.	Dados Incompletos no DANFE: Se colunas como NCM faltarem na extração, marcar a célula no grid em vermelho para atenção do usuário.
72.	Sincronização Offline: Se a internet cair, manter alterações no Zustand e tentar sincronizar com Supabase ao detectar reconexão.
73.	Limites de Armazenamento: Validar tamanho do PDF gerado para garantir que o download não falhe em dispositivos móveis.
74.	Caracteres Especiais: Sanitizar inputs para evitar ataques de XSS nos campos de descrição e código.
18. REFERÊNCIAS EXTERNAS
●	Documentação Supabase: https://supabase.com/docs
●	Zustand State Management: https://github.com/pmndrs/zustand
●	PDF.js Library: https://mozilla.github.io/pdf.js/
●	Open Code Zen API Reference: https://opencode.zen/docs
●	jsPDF Documentation: https://artskydj.github.io/jsPDF/docs/
●	Tailwind CSS Patterns: https://tailwindcss.com/docs
