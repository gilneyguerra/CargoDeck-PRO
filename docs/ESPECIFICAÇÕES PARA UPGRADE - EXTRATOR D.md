ESPECIFICAÇÕES PARA UPGRADE - EXTRATOR DE MANIFESTO DE CARGA (PDF e OCR)
Documento técnico detalhado para aprimoramento do sistema de extração de dados de manifestos de carga
05 de abril de 2026

1. Visão Geral e Contexto
O presente documento detalha as especificações técnicas para o upgrade do extrator de manifestos de carga. O objetivo principal é aprimorar a capacidade do sistema de extrair informações cruciais de documentos PDF de manifestos de carga, sejam eles nativos (com texto selecionável) ou escaneados (imagens), e, a partir dessas extrações, criar objetos de carga que serão exibidos e gerenciados na interface do aplicativo. Este upgrade visa aumentar a precisão, robustez e automação do processo de importação de dados de carga, reduzindo a necessidade de entrada manual e melhorando a experiência do usuário.
2. Estrutura do Manifesto de Carga - Elementos a Extrair
A seguir, são detalhados os elementos específicos a serem extraídos de cada manifesto de carga. A exatidão na identificação e extração desses dados é fundamental para o correto funcionamento do sistema.
1.	Nome da Embarcação: Localizado no cabeçalho do documento, geralmente circulado em preto.
2.	Número do Atendimento: Também no cabeçalho, circulado em preto, seguindo um padrão numérico (ex: "509442732").
3.	Roteiro Previsto de Cargas: Uma sequência de portos ou terminais, destacada em VERMELHO (ex: "PBG -> PACU -> NS63 -> NS32 -> NS44 -> PNIT -> PBG -> NS57 -> PACU").
4.	Local de Origem da Carga: Identificado por um código e nome, destacado em AMARELO (ex: "PBD - Porto da baia de Guanabara").
5.	Local de Destino da Carga: Identificado por um código e nome, destacado em AMARELO (ex: "NS63 - Tidal Action").
6.	Descrição de Cada Carga: Texto descritivo do item, destacada em VERDE (ex: "CONTAINER MLTU 280189-9").
7.	Código Identificador Único da Carga: Um código alfanumérico que identifica a carga, sublinhado em ROSA. Pode aparecer antes ou depois da descrição da carga (ex: "MLTU 280189-9" ou "280189-9").
8.	Dimensões de Cada Carga: Apresentadas no formato Comprimento x Largura x Altura (CxLxA), destacadas com BORDA ROXA (ex: "6,00x2,43x2,60"). As unidades são geralmente em metros.
9.	Peso de Cada Carga: Valor numérico seguido da unidade KG, destacado com BORDA MARROM (ex: "9.000,00 KG"). Este valor deve ser automaticamente convertido para toneladas (t) para exibição no aplicativo.
3. Capacidades Técnicas Obrigatórias
O sistema a ser desenvolvido ou aprimorado deve possuir as seguintes capacidades funcionais:
●	Leitura de PDFs Nativos: Capacidade de ler e extrair texto diretamente de arquivos PDF que contêm texto selecionável (OCR-able).
●	Processamento de PDFs Escaneados/Imagem: Habilidade de aplicar Optical Character Recognition (OCR) completo em arquivos PDF que são essencialmente imagens, para converter o conteúdo visual em texto pesquisável e extraível.
●	Detecção Automática de Tipo de PDF: O sistema deve ser capaz de identificar automaticamente se um PDF é nativo ou escaneado, aplicando a metodologia de extração apropriada.
●	Extração Precisa dos 9 Elementos: Garantir a extração individual e precisa de todas as nove informações de carga listadas na Seção 2.
●	Criação de Objetos de Carga: Após a extração, o sistema deve criar objetos de carga estruturados conforme a especificação da Seção 5.
●	Adição à Lista "NÃO ALOCADAS": As cargas extraídas devem ser automaticamente adicionadas à lista "NÃO ALOCADAS" na barra lateral esquerda da interface do aplicativo.
●	Lógica de Dimensões Físicas: As dimensões (CxLxA) extraídas do manifesto devem ser utilizadas para calcular e renderizar o tamanho físico visual das cargas no aplicativo. Isso implica: *   Aplicação de uma escala adequada baseada nas dimensões extraídas para representar visualmente o volume da carga. *   Conversão das unidades de medida do manifesto (metros) para pixels ou unidades de medida internas do aplicativo, mantendo a proporção. *   Exemplo: Uma carga com dimensões "6,00x2,43x2,60" metros deve ser visualmente maior e proporcionalmente correta em comparação com uma carga de "2.7x1.5" metros. *   O tamanho visual deve ser renderizado corretamente e manter sua proporção quando a carga for clicada e arrastada na interface.
●	Interação Drag-and-Drop: Permitir que o usuário clique em uma carga não alocada e a arraste para as abas de cargas disponíveis (ex: "Convés Principal", "Pipedeck", "Riser Deck").
●	Manutenção de Funcionalidades Existentes: As funcionalidades atuais de deletar ou editar cargas individualmente devem ser mantidas e integradas com as novas cargas extraídas.
4. Tratamento de Erros e Casos Extremos
O extrator deve ser robusto e capaz de lidar com diversas variações e situações atípicas nos manifestos:
●	Posição do Código Identificador: O código identificador único da carga pode vir antes ou depois da descrição da carga. O extrator deve ser capaz de identificá-lo em ambas as posições.
●	Resolução de PDFs Escaneados: PDFs escaneados podem apresentar baixa resolução ou qualidade de imagem. O OCR utilizado deve ser robusto o suficiente para lidar com essas variações e extrair o texto com alta precisão.
●	Formatação de Dimensões: As dimensões podem usar diferentes separadores entre os valores (ex: "x", "X", "×", "-"). O extrator deve reconhecer essas variações.
●	Formatação de Pesos: Os pesos podem usar vírgula ou ponto como separador decimal (ex: "9.000,00 KG" ou "9,000.00 KG"). O extrator deve normalizar esses valores.
●	Campos Vazios ou Ausentes: Se um campo específico não for encontrado no manifesto, o sistema não deve falhar. Em vez disso, deve marcar o campo correspondente no objeto de carga como não preenchido (ex: `null` ou string vazia).
●	Múltiplas Cargas: Manifestos podem conter múltiplas cargas (até 50 ou mais itens). O extrator deve ser capaz de processar todas as cargas presentes no documento de forma individualizada.
●	Conversão de Peso: O peso extraído em KG deve ser automaticamente convertido para toneladas (t) para exibição no aplicativo, utilizando a fórmula
$$1 \text{ tonelada} = 1000 \text{ KG}$$
.
5. Estrutura de Dados do Objeto Carga
Cada carga extraída deve ser representada por um objeto com a seguinte estrutura:
json {   "id": "UUID único gerado",
"nomeEmbarcacao": "string",
"numeroAtendimento": "string",
"descricaoCarga": "string",
"codigoUnico": "string",
"origemCarga": "string",
"destinoCarga": "string",
"roteiroPrevisto": ["string", "string", "..."],
"dimensoes": {
"comprimento": "number (em metros)",
"largura": "number (em metros)",
"altura": "number (em metros)",
"unidade": "m"   },   "peso": {
"valorOriginal": "number (em KG)",
"valorEmToneladas": "number (conversão automática)",
"unidade": "t"   },   "tamanhoFisico": {
"larguraPixels": "number",
"alturaPixels": "number",
"profundidadePixels": "number",
"escala": "number (proporção aplicada)"   },   "tipo": "string (ex: CONTAINER, CAIXA, CESTA)",
"statusAlocacao": "NAO_ALOCADO",
"dataExtracao": "ISO string",
"fonteManifesto": "string (caminho ou ID do arquivo PDF)" }
6. Fluxo de Processamento
O fluxo de processamento para a extração de manifestos de carga deve seguir os seguintes passos:
10.	Usuário faz upload de PDF: O usuário inicia o processo enviando um arquivo PDF através da interface.
11.	Detecção de Tipo de PDF: O sistema analisa o PDF para determinar se ele contém texto nativo ou se é uma imagem escaneada.
12.	Extração de Texto (PDF Nativo): Se o PDF for nativo, o sistema extrai o texto diretamente do documento.
13.	Aplicação de OCR (PDF Escaneado): Se o PDF for escaneado, o sistema aplica uma ferramenta de OCR (como Tesseract, Google Vision API ou similar) para converter a imagem em texto.
14.	Parsing do Texto Extraído: O texto obtido (seja por extração direta ou OCR) é então processado para localizar e identificar cada carga individualmente, utilizando técnicas de pattern matching e expressões regulares.
15.	Processamento por Carga: Para cada carga identificada no texto: *   Extrair a descrição da carga. *   Encontrar o código identificador único, utilizando regex para padrões numéricos/alfanuméricos. *   Extrair as dimensões (CxLxA), normalizando diferentes formatos. *   Extrair o peso em KG, normalizando separadores decimais. *   Converter o peso de KG para toneladas. *   Calcular o tamanho físico proporcional para renderização na interface.
16.	Criação de Objeto Carga: Um objeto de carga é criado para cada item, preenchendo todos os campos conforme a estrutura definida na Seção 5.
17.	Adição à Lista "NÃO ALOCADAS": Os objetos de carga recém-criados são adicionados à lista de cargas "NÃO ALOCADAS" no sistema.
18.	Exibição na Sidebar Esquerda: As cargas são exibidas visualmente na barra lateral esquerda da interface do usuário.
19.	Interação Drag-and-Drop: O sistema permite que o usuário interaja com essas cargas, arrastando-as para as baias de alocação.
7. REGEX e Padrões para Extração
Sugestões de expressões regulares e padrões para auxiliar na extração dos dados:
●	Código Identificador:   Padrão: `(\b[A-Z]{3,4}\s\d{6,9}[-]?\d?\b|\b\d{6,9}[-]?\d?\b)` *   Descrição: Busca por códigos de contêiner (4 letras + 6-9 dígitos + dígito de controle opcional) ou apenas sequências de 6 a 9 dígitos com hífen opcional.
●	Dimensões (CxLxA):   Padrão: `(\d+[.,]\d+)\s[xX×-]\s(\d+[.,]\d+)\s[xX×-]\s(\d+[.,]\d+)\s(?:m|M)?` *   Descrição: Captura três números decimais (com vírgula ou ponto) separados por 'x', 'X', '×' ou '-', opcionalmente seguido por 'm' ou 'M'.
●	Peso (KG): *   Descrição: Captura números inteiros ou decimais (com vírgula ou ponto como separador decimal e opcionalmente separador de milhar) seguidos por variações de "KG".
●	Tipo de Carga (ex: CONTAINER): *   Descrição: Lista de palavras-chave para identificar o tipo principal da carga.
●	Roteiro Previsto:   Padrão: `(?:Roteiro Previsto de Cargas|ROTEIRO PREVISTO|ROTEIRO):\s([A-Z0-9\s-]+)` *   Descrição: Busca por "Roteiro Previsto de Cargas" ou variações, seguido por uma sequência de códigos de portos/terminais separados por "-".
●	Local de Origem/Destino:   Padrão: `(?:Origem|Destino):\s([A-Z0-9]{3,4}\s-\s[^\ ]+)` *   Descrição: Busca por "Origem" ou "Destino", seguido por um código de 3-4 caracteres, hífen e o nome do local.
8. Integração com a Interface
A integração das cargas extraídas com a interface do usuário é um ponto crítico. As cargas devem ser apresentadas de forma intuitiva e funcional:
●	Aparência Visual: As cargas extraídas devem aparecer na barra lateral esquerda (lista "NÃO ALOCADAS") como cards, seguindo o layout visual existente no aplicativo.
●	Conteúdo do Card: Cada card de carga deve exibir as seguintes informações: *   Um ícone azul (marcador visual). *   O peso da carga no formato "1 x 5.6 t" (quantidade x peso em toneladas). *   O ID da carga, combinando o tipo e o código único (ex: "CESTA TIGER: 802567-3"). *   As dimensões da carga no formato "8.3x1.2 m" (Comprimento x Largura, com unidade). *   O tipo de carga (ex: "CONTAINER"). *   Um ícone de edição (lápis azul) para permitir modificações. *   Um ícone de exclusão (lixeira vermelha) para remover a carga.
●	Renderização Proporcional: O tamanho visual do card da carga na interface deve ser renderizado proporcionalmente às dimensões físicas (CxLxA) extraídas do manifesto, conforme a lógica de escala definida na Seção 3.
●	Interatividade: As cargas devem ser clicáveis e arrastáveis, permitindo que o usuário as mova da lista "NÃO ALOCADAS" para as baias de alocação designadas (ex: "Convés Principal", "Pipedeck", "Riser Deck").
9. Validação e Testes
Para garantir a qualidade e a confiabilidade do upgrade, os seguintes testes e validações devem ser realizados:
●	Validação de Extração Completa: Confirmar que todas as 9 informações especificadas na Seção 2 são extraídas corretamente para cada carga.
●	Testes com PDFs Nativos: Realizar testes extensivos com uma variedade de PDFs nativos para garantir a extração precisa do texto.
●	Testes com PDFs Escaneados: Testar o OCR e a extração com PDFs escaneados de diferentes qualidades e resoluções (baixa, média, alta).
●	Testes de Volume de Cargas: Validar o processamento de manifestos com diferentes quantidades de cargas, desde um único item até 50 ou mais itens, garantindo que todos sejam extraídos.
●	Validação de Conversões de Peso: Verificar a exatidão da conversão de KG para toneladas para todos os pesos extraídos.
●	Validação de Proporções de Dimensões: Assegurar que a renderização visual das cargas na interface reflita corretamente suas dimensões relativas (cargas maiores devem parecer maiores que cargas menores).
●	Robustez a Dados Incompletos: Confirmar que o sistema não falha ou gera crashes ao encontrar campos vazios ou ausentes no manifesto, apenas marcando-os como não preenchidos no objeto de carga.
●	Testes de Regressão: Garantir que as funcionalidades existentes (edição, exclusão, drag-and-drop) continuam operando corretamente após o upgrade.
10. Código Atual - Como Melhorar
O agente de IA (Claude Code) deve abordar o upgrade do extrator de manifestos de carga seguindo as diretrizes abaixo:
●	Análise do Código Existente: Iniciar com uma análise aprofundada do código-fonte atual do extrator de PDF para compreender sua arquitetura, as funções de parsing existentes e os pontos de integração.
●	Identificação de Funções de Parsing: Mapear as funções ou módulos responsáveis pela leitura e interpretação de PDFs.
●	Implementação de Detecção de Tipo de PDF: Adicionar uma função para detectar se o PDF é nativo ou escaneado, direcionando para o fluxo de processamento adequado.
●	Criação de Função OCR Robusta: Desenvolver ou integrar uma função de OCR robusta para lidar com PDFs escaneados, utilizando bibliotecas ou APIs de terceiros (ex: Tesseract, Google Vision API) conforme a tecnologia atual do projeto.
●	Aprimoramento de Regex para Extração: Refinar e expandir as expressões regulares e os padrões de extração para cobrir todos os 9 elementos especificados, considerando as variações e casos extremos detalhados na Seção 4.
●	Implementação da Lógica de Tamanho Físico: Desenvolver a lógica para calcular o tamanho físico proporcional das cargas com base nas dimensões extraídas, incluindo a conversão de unidades e a aplicação de escala para a renderização visual.
●	Integração com Sistema de Drag-and-Drop: Integrar as novas cargas extraídas com o sistema de drag-and-drop existente na interface, garantindo que a interação seja fluida e responsiva.
●	Preservação de Funcionalidades Existentes: Assegurar que as funcionalidades de edição e exclusão de cargas individuais não sejam afetadas negativamente pelas novas implementações.
●	Testes Incrementais: Realizar testes unitários e de integração para cada nova função ou modificação implementada, garantindo a estabilidade do sistema em cada etapa.
11. Observações Críticas
Atenção: O agente de IA DEVE ENTENDER o código atual do extrator de PDF ANTES de iniciar qualquer modificação. Uma compreensão completa da base de código existente é crucial para evitar introdução de bugs e garantir a compatibilidade.
●	Mudanças Incrementais: Todas as modificações devem ser implementadas de forma incremental, com commits pequenos e bem definidos, para facilitar a revisão e o rollback, se necessário.
●	Testes Isolados: Cada nova função ou alteração em uma função existente deve ser testada isoladamente para verificar seu comportamento esperado e garantir que não introduza efeitos colaterais indesejados.
●	Compatibilidade: Manter a compatibilidade com o restante da aplicação é primordial. Novas implementações não devem quebrar funcionalidades existentes ou introduzir dependências incompatíveis.
●	Documentação de Código: Cada mudança significativa no código deve ser acompanhada de documentação clara e concisa, explicando a lógica implementada, as decisões de design e quaisquer considerações importantes.
●	Performance: As soluções implementadas devem considerar a performance, especialmente no processamento de PDFs grandes ou com muitas cargas, para garantir uma experiência de usuário fluida.

Documento elaborado em 05 de abril de 2026. As informações contidas são de responsabilidade do solicitante.
