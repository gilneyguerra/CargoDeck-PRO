GUIA DETALHADO - EXTRAÇÃO DE MANIFESTOS DE CARGA PARA AGENTE ANTIGRAVITY
Especificações Técnicas para Processamento OCR e Extração de Dados de Manifestos Marítimos
GUIA DETALHADO - EXTRAÇÃO DE MANIFESTOS DE CARGA PARA AGENTE ANTIGRAVITY1. 
INTRODUÇÃO
Este documento estabelece as diretrizes técnicas para o agente Antigravity realizar a extração automatizada de dados em manifestos de carga complexos, especificamente no padrão Petrobras/Marítimo. O objetivo central é converter documentos não estruturados em dados acionáveis para o sistema CargoDeck Pro, garantindo integridade e precisão no inventário de carga.
A extração deve superar desafios críticos como PDFs escaneados com baixa qualidade, rotações acidentais de página (0°, 90°, 180°, 270°), múltiplas seções de origem e destino em um único arquivo, e a necessidade imperativa de normalização de unidades de medida, transformando quilogramas em toneladas para compatibilidade com o sistema de destino.
2. ESTRUTURA FÍSICA DO MANIFESTO
2.1 Componentes Principais (em Ordem de Aparição)
IDENTIFICAÇÃO DO MANIFESTO (Topo da Página): Localizado nas linhas 1 a 3 do documento. Contém o nome da empresa (PETROBRAS), o tipo de manifesto (ex: T5R), a base de origem (ex: PACU), numeração de página, ID do equipamento, local/ilha, data no formato DD/MM/YYYY, hora e número de atendimento.
ROTEIRO PREVISTO (Logo após identificação): Apresentado no formato "Roteiro previsto [ORIGEM] -> [DESTINO1] -> [DESTINO2]". Este campo é fundamental para validar as origens e destinos encontrados nas tabelas subsequentes.
CABEÇALHO DA TABELA (Definição de Colunas): Define os campos IT (Item sequencial), AT (Atividade), RT/EMB (Rota/Embarque), ITEM/SUB, QTDE (Quantidade), UND (Unidade), DESCRIÇÃO (Coluna amarela), CxLxA(M) (Dimensões - Coluna verde), PESO(KG) (Peso - Coluna roxa) e EMPRESA/GERÊNCIA.
SEÇÕES DE ORIGEM/DESTINO (Delimitadores de Contexto): Linhas que marcam o início de um novo lote de carga. Formato: "ORIGEM: [NOME DA BASE]" seguido por "DESTINO: [NOME DO NAVIO/BASE]". Todas as cargas listadas após estes delimitadores pertencem a esta seção até que novos delimitadores apareçam.
LISTA DE CARGAS (Corpo Principal): Cada linha representa uma carga individual, iniciando obrigatoriamente com o número IT (ex: 0044). A extração deve capturar o ID, descrição, dimensões e peso de forma granular.
MUDANÇA DE SEÇÃO: Identificada pelo surgimento de novas linhas de ORIGEM e DESTINO. O sistema deve salvar a seção anterior e iniciar o processamento da nova imediatamente.
2.2 Campos Críticos e Suas Características
Campo IT (Identificador): Formato de 4 dígitos (ex: 0044). Localizado na primeira coluna. Deve ser usado como chave primária do item dentro da seção.
Campo DESCRIÇÃO: Texto livre localizado na coluna amarela. Contém informações como "CONTAINER FCDRU20108" ou identificação de eslingas. Deve ser extraído integralmente.
Campo CxLxA(M) (Dimensões): Localizado na coluna verde. Formato esperado "Comprimento x Largura x Altura". Deve ser normalizado para o padrão "0.00 x 0.00 x 0.00" com ponto decimal.
Campo PESO(KG) (Conversão Obrigatória): Localizado na coluna roxa. Representa o peso em quilogramas. O sistema deve aplicar a fórmula de conversão para toneladas.
Campo EMPRESA/GERÊNCIA: Localizado na última coluna. Identifica o responsável ou empresa proprietária da carga. Pode estar vazio em alguns casos.
3. DESAFIOS TÉCNICOS E SOLUÇÕES3.1 Desafio 1: PDFs Escaneados com RotaçãoDocumentos escaneados frequentemente apresentam inclinação ou rotação total, o que impede a leitura linear. A solução envolve a detecção automática da orientação através de metadados de script e a aplicação de correções via processamento de imagem.
```python
import pytesseract
import cv2def corrigir_rotacao(image_path):
img = cv2.imread(image_path)
# Detectar orientação automática
osd = pytesseract.image_to_osd(img)
angle = osd.get('rotate', 0)
# Se não está em 0°, corrigir
if angle != 0:
h, w = img.shape[:2]
M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC)
return img, angle
#### 3.2 Desafio 2: Conversão de Unidades (KG para TON)

<p style="text-align: justify;">O sistema CargoDeck Pro opera exclusivamente em toneladas, enquanto os manifestos utilizam quilogramas. A conversão deve ser precisa e incluir arredondamento para duas casas decimais.</p>

$$TON = \frac{KG}{1000}$$
```python
def converter_peso(peso_kg_str):
    # Limpar string e converter para float
    peso_kg_str = peso_kg_str.replace('.', '').replace(',', '.')
    peso_kg = float(peso_kg_str)
    # Converter para TON e arredondar
    peso_ton_final = round(peso_kg / 1000, 2)
    return {
        "peso_kg_original": peso_kg,<br/>
        "peso_ton": peso_ton_final,<br/>
        "status": "OK" if 0.1 < peso_ton_final < 50000 else "ALERTA"
    }3.3 Desafio 3: Múltiplas ORIGEM/DESTINO no Mesmo DocumentoO extrator deve funcionar como uma máquina de estados, identificando mudanças de contexto geográfico. Ao detectar uma nova linha de ORIGEM/DESTINO, o lote de cargas anterior deve ser fechado e um novo objeto de seção deve ser instanciado, mantendo a hierarquia de dados.3.4 Desafio 4: Dimensões em Formato VariávelAs dimensões podem aparecer com diferentes separadores (x, X, *) ou decimais (vírgula ou ponto). O uso de expressões regulares robustas é necessário para garantir que os três valores (C, L, A) sejam capturados corretamente.
```python
import redef normalizar_dimensoes(dim_str):
pattern = r'(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*[xX]?\s*(\d+(?:[.,]\d+)?)?'
match = re.search(pattern, dim_str)
if match:
c = match.group(1).replace(',', '.')
l = match.group(2).replace(',', '.')
a = match.group(3).replace(',', '.') if match.group(3) else "0.00"
return f"{c} x {l} x {a}"
return dim_str
### 4. ESTRUTURA DE EXTRAÇÃO - PASSO A PASSO

#### 4.1 PASSO 1: Preparação do Arquivo

- **Etapa 1.1:** Validar extensão .pdf e integridade do arquivo.<br/>
- **Etapa 1.2:** Converter PDF para imagens PNG/TIFF com 300 DPI.<br/>
- **Etapa 1.3:** Aplicar filtros de escala de cinza e binarização de Otsu.<br/>
- **Etapa 1.4:** Corrigir rotação e deskew para garantir horizontalidade do texto.

#### 4.2 PASSO 2: Extração de Campos Globais

- **Empresa:** Localizar "PETROBRAS" no cabeçalho.<br/>
- **Base/Equipamento:** Capturar valores após os rótulos "BASE:" e "EQUIPAMENTO:".<br/>
- **Data/Hora:** Extrair formatos DD/MM/YYYY e HH:MM:SS.<br/>
- **Roteiro:** Capturar a string completa após "Roteiro previsto" e converter em uma lista de strings separadas por "->".

#### 4.3 PASSO 3: Identificar Seções e Cargas

- **Detecção de Seção:** Monitorar linhas para os padrões "ORIGEM:" e "DESTINO:".<br/>
- **Extração de Itens:** Para cada linha iniciada com 4 dígitos (IT), capturar Descrição, Dimensões (CxLxA), Peso (KG) e Empresa.<br/>
- **Conversão em Tempo Real:** Aplicar a divisão por 1000 no campo de peso e a normalização de strings no campo de dimensões.

#### 4.4 PASSO 4: Estruturação de Saída JSON
```json
{
  "manifesto": {<br/>
    "atendimento": "509454198 069",<br/>
    "data": "05/02/2026",<br/>
    "roteiro": ["PACU", "NS63", "NS51", "BMAC", "NS32", "NS44", "PACU"],<br/>
    "secoes": [
      {
        "origem": "PACU",<br/>
        "destino": "NS44",<br/>
        "cargas": [
          {
            "id": "0044",<br/>
            "descricao": "CONTAINER FCDRU20108",<br/>
            "dimensoes": "3.00 x 2.27 x 2.27",<br/>
            "peso_ton": 7.94,<br/>
            "empresa": "HALLIBURTON"
          }
        ]
      }
    ]
  }
}5. TRATAMENTO DE ERROS E EXCEÇÕES
Peso Inválido: Se o peso não puder ser convertido ou resultar em zero, marcar como "PESO_REVISAO" e notificar o usuário.
Roteiro Inconsistente: Se a ORIGEM ou DESTINO extraídos não constarem na lista do "Roteiro Previsto", sinalizar como "ALERTA_LOGISTICO".
Página Ilegível: Caso o OCR apresente confiança média inferior a 60%, interromper o processo e solicitar intervenção manual.
Dimensões Incompletas: Se apenas dois valores forem detectados (ex: CxL), assumir Altura como 0.00 e marcar para conferência.
6. VALIDAÇÕES CRÍTICAS
Validação de Rota: Cruzar cada par Origem/Destino com a lista global de roteiro extraída no cabeçalho.
Integridade de Peso: Bloquear pesos superiores a 50 toneladas por item, a menos que confirmado manualmente (prevenção de erro de leitura de ponto decimal).
Sequencial de Itens: Verificar se há saltos grandes na numeração IT que possam indicar perda de linhas durante o OCR.
7. CHECKLIST FINAL PARA O AGENTE
 PDF convertido com 300 DPI e binarizado?
 Rotação de página corrigida para 0°?
 Roteiro previsto extraído como lista de strings?
 Todas as seções ORIGEM/DESTINO identificadas?
 Pesos convertidos de KG para TON (divisão por 1000)?
 Dimensões normalizadas no formato "C x L x A"?
 JSON gerado segue a estrutura hierárquica definida?
 Campos de baixa confiança marcados para revisão?

GUIA TÉCNICO DE EXTRAÇÃO E INTEGRIDADE DE DADOSImplementação de OCR Avançado, Identificação Única e Detecção de Duplicatas27 de abril de 20261. SISTEMA DE DETECÇÃO DE DUPLICATASO sistema de detecção de duplicatas é o pilar de integridade do CargoDeck Pro. Ele garante que a mesma carga não seja contabilizada múltiplas vezes no convés, o que comprometeria os cálculos de estabilidade e o manifesto de carga. A detecção baseia-se na criação de uma chave primária virtual (Hash) que vincula a identidade da carga ao seu contexto logístico.
Uso do Código Identificador como Chave: Cada carga possui um código alfanumérico único. Este código, após normalizado, serve como o identificador principal.
Estrutura do ID Único: Para evitar colisões entre diferentes operações, o ID final é gerado através de um hash SHA-256 combinando: Código Normalizado + Origem + Destino.
Validação Pré-Inserção: Antes de qualquer persistência no banco de dados, o sistema deve realizar uma consulta de "lookup" para verificar a existência do hash.
Log de Duplicatas: Toda tentativa de inserção duplicada deve ser registrada em um log de auditoria, contendo o timestamp e a página de origem do PDF onde a duplicata foi encontrada.
Feedback ao Usuário: O sistema deve emitir um alerta visual notificando: "Carga [ID] já existente no manifesto (Origem: [X] / Destino: [Y]). Extração ignorada para evitar duplicidade."
2. EXTRAÇÃO DE CÓDIGOS IDENTIFICADORES ÚNICOSA extração precisa do código identificador é o maior desafio do OCR em plantas de carga, devido à variação de posicionamento e ruído visual. O algoritmo deve ser capaz de isolar o código real de informações acessórias.
Definição de Código Identificador: Conjunto alfanumérico que identifica a unidade de carga. Exemplos comuns: HWO C 00029, U 20065, ER 0002.
Variabilidade de Posição: O código pode aparecer no início da descrição ("HWO C 00029 CAIXA DE FERRAMENTAS"), no meio ("CONJUNTO U 20065 COMPLETO") ou no fim ("GERADOR ELETRICO ER 0002").
Normalização de Espaços: O OCR frequentemente interpreta espaços extras (ex: "HWO  C  00029"). O sistema deve remover todos os espaços internos para processamento, mantendo a versão original apenas para exibição.
Regra de Exclusão Crítica (ESLINGAS): Números que sucedem os termos "ESL." ou "ESLINGA" NÃO são códigos de carga. Eles referem-se aos cabos de aço de içamento e devem ser ignorados pelo extrator de IDs.
Padrão Regex Recomendado: O padrão base para busca é [A-Z]{1,4}[\s]?\d{4,6}, que captura de 1 a 4 letras seguidas de um espaço opcional e 4 a 6 dígitos.
Filtros de Ruído: Devem ser descartadas datas (DD/MM/YYYY) e quantidades isoladas (ex: "2 UNIDADES") que possam mimetizar o padrão do código.
3. ESTRUTURA JSON DA CARGA EXTRAÍDAPara garantir a interoperabilidade entre o backend de extração e o frontend do CargoDeck, toda carga deve ser convertida para o seguinte formato JSON padronizado:
```json
{
  "id": "sha256_hash_hex_string",
  "codigo_identificador": "HWOC00029",
  "origem": "PACU",
  "destino": "NS44",
  "descricao": "HWO C 00029 CAIXA DE FERRAMENTAS",
  "dimensoes_cxlxa": {
    "comprimento": 2.50,
    "largura": 1.20,
    "altura": 1.80,
    "unidade": "m"
  },
  "peso_ton": 1.25,
  "metadados": {
    "data_extracao": "2026-04-27T14:30:00Z",
    "pagina_origem": 1,
    "hash_descricao": "hash_da_string_original"
  }
}
```
Conversão de Peso: O sistema deve ler o valor em KG e realizar a divisão automática por 1.000 para preencher o campo peso_ton.
Normalização de Dimensões: Valores devem ser sempre convertidos para float, utilizando o ponto como separador decimal.
4. ALGORITMO DE DETECÇÃO DE DUPLICATASO processo de verificação segue uma sequência lógica rigorosa para evitar falsos positivos e garantir a performance do sistema:
Passo 1 (Normalização): O código extraído passa por strip(), replace(" ", "") e upper().
Passo 2 (Geração de Hash): Cria-se uma string concatenada: codigo + origem + destino. Aplica-se o algoritmo SHA-256 sobre esta string.
Passo 3 (Consulta): O sistema executa uma busca indexada no banco de dados pelo campo id.
Passo 4 (Decisão): Se o ID for encontrado, o objeto atual é marcado como DUPLICATE_IGNORE. Se não for encontrado, o status é NEW_ENTRY.
Passo 5 (Tratamento de Conflito): Caso a descrição seja diferente mas o ID seja igual, o sistema deve sinalizar "Conflito de Descrição" para revisão manual do usuário.
5. FLUXO DE EXTRAÇÃO REFATORADOO pipeline de processamento foi otimizado para lidar com arquivos escaneados de baixa qualidade e orientações diversas:
Entrada e Pré-processamento: Recebimento do arquivo e detecção automática de orientação. Se o texto estiver invertido ou horizontal, o OpenCV rotaciona a matriz da imagem antes do OCR.
Captura de Contexto Global: Identificação das palavras-chave "ORIGEM:" e "DESTINO:". Estes valores tornam-se variáveis globais para todas as cargas listadas abaixo deles até que uma nova origem/destino seja detectada.
Iteração por Linha de Carga:

Extração da descrição textual completa.
Aplicação de Regex para isolar o Código Identificador (validando contra a regra de eslingas).
Captura de dimensões no formato numérico (C x L x A).
Captura de peso e conversão imediata para Toneladas (TON=KG/1000TON = KG / 1000TON=KG/1000).


Validação e Integridade: Geração do hash único e verificação de duplicatas no banco de dados.
Saída Estruturada: Geração do JSON final e notificação de progresso ao usuário.
6. EXEMPLOS PRÁTICOS DE EXTRAÇÃOAbaixo, exemplos de como o algoritmo deve se comportar diante de diferentes strings extraídas do PDF:
Exemplo 1 (Código no Início):

Entrada: "HWO C 00029 CAIXA DE FERRAMENTAS"
Extração: Código = "HWOC00029"


Exemplo 2 (Código no Meio):

Entrada: "CONJUNTO DE TUBOS U 20065 PARA NS44"
Extração: Código = "U20065"


Exemplo 3 (Código no Fim):

Entrada: "GERADOR DIESEL MODELO ER 0002"
Extração: Código = "ER0002"


Exemplo 4 (Ignorar Eslinga):

Entrada: "CAIXA DE ACESSORIOS ESL. 55432"
Extração: Código = NULL (O número 55432 é ignorado por vir após "ESL.")


Exemplo 5 (Duplicata):

Carga A: Código "ER0002", Origem "PACU", Destino "NS44"
Carga B: Código "ER0002", Origem "PACU", Destino "NS44"
Resultado: Carga B é bloqueada pelo sistema de Hash.


7. PSEUDOCÓDIGO PYTHON PARA IMPLEMENTAÇÃOEste código serve como base lógica para o agente Antigravity implementar as funções core do sistema:
```python
import re
import hashlibdef extrair_codigo_identificador(descricao):
# Ignorar números de eslingas
if re.search(r'(ESL.|ESLINGA)\s?\d+', descricao, re.IGNORECASE):
descricao_limpa = re.sub(r'(ESL.|ESLINGA)\s?\d+', '', descricao, flags=re.IGNORECASE)
else:
descricao_limpa = descricao# Regex para código identificador
padrao = r'([A-Z]{1,4}\s?\d{4,6})'
match = re.search(padrao, descricao_limpa.upper())

if match:
    return match.group(1).replace(" ", "")
return Nonedef gerar_hash_unico(codigo, origem, destino):
string_base = f"{codigo}{origem}{destino}".upper()
return hashlib.sha256(string_base.encode()).hexdigest()def converter_kg_para_ton(peso_kg):
try:
return float(peso_kg) / 1000.0
except:
return 0.0def estruturar_carga_json(linha_texto, origem, destino, pagina):
codigo = extrair_codigo_identificador(linha_texto)
if not codigo:
return Nonehash_id = gerar_hash_unico(codigo, origem, destino)

# Lógica simplificada de dimensões e peso
# ... extração via regex de números ...

return {
    "id": hash_id,<br/>
    "codigo_identificador": codigo,<br/>
    "origem": origem,<br/>
    "destino": destino,<br/>
    "descricao": linha_texto.strip(),<br/>
    "peso_ton": converter_kg_para_ton(extrair_peso_bruto(linha_texto)),<br/>
    "pagina_origem": pagina
}
## 8. TRATAMENTO DE ERROS E VALIDAÇÕES

- **Código Inválido:** Se o regex não encontrar um ID, a carga deve ser enviada para uma fila de "Revisão Manual" e não descartada silenciosamente.<br/>
- **Pesos e Medidas:** Valores de peso <= 0 ou dimensões nulas devem disparar um alerta de "Dados Inconsistentes".<br/>
- **Origem/Destino Ausentes:** Caso o OCR falhe em detectar o cabeçalho da página, o sistema deve assumir os valores da página anterior e solicitar confirmação.<br/>
- **Página Invertida:** O sistema deve verificar a confiança (confidence score) do OCR. Se for inferior a 60%, deve tentar rotacionar a imagem em 90º, 180º e 270º até obter um score superior a 85%.

## 9. CHECKLIST DE IMPLEMENTAÇÃO PARA ANTIGRAVITY

- [ ] Configurar ambiente Python com `pytesseract` ou `PaddleOCR` e `OpenCV`.
- [ ] Implementar função `extrair_codigo_identificador` com suporte a exclusão de eslingas.
- [ ] Criar rotina de normalização de strings (remover espaços e caracteres especiais).
- [ ] Implementar gerador de Hash SHA-256 para IDs únicos.
- [ ] Desenvolver middleware de verificação de duplicatas no banco de dados (PostgreSQL/Supabase).
- [ ] Validar conversão matemática de KG para TON ($$x / 1000$$).
- [ ] Criar sistema de logs para capturar e reportar duplicatas encontradas.
- [ ] Implementar interface de feedback no frontend para alertar o usuário sobre cargas ignoradas.
- [ ] Testar o fluxo completo com os PDFs de exemplo fornecidos.