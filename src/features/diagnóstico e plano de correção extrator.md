DIAGNÓSTICO E PLANO DE CORREÇÃO: EXTRATOR DE MANIFESTOSOtimização de OCR, Lógica de Negócio e Integridade de Dados
1. Problemas Identificados no Extrator AtualApós análise técnica do comportamento do extrator em documentos reais, foram identificadas falhas críticas que comprometem a integridade dos dados importados para o sistema CargoDeck. Os pontos abaixo detalham as inconsistências que necessitam de intervenção imediata.1.1. Falha na Captura de Origem/Destino: O sistema está realizando capturas parciais, ignorando o nome completo das instalações portuárias (ex: captura apenas "PACU" em vez de PACU PORTO DO AÇU), o que inviabiliza a rastreabilidade logística.1.2. Fragmentação de Descrições: As descrições das cargas estão sendo extraídas de forma incompleta ou com a ordem das palavras invertida, dificultando a identificação do item pelo operador de convés.1.3. Omissão de Códigos Identificadores: O extrator falha em localizar códigos únicos quando estes não estão no início da string, ignorando identificadores posicionados no meio ou ao final da descrição da carga.1.4. Falsos Positivos (ESLINGAS): O algoritmo não diferencia códigos de carga de números de série de acessórios de içamento. Números precedidos por ESL. ou ESLINGA estão sendo erroneamente catalogados como identificadores de carga.1.5. Quebra de Seção Inexistente: A presença de múltiplos trechos (ex: Nº Trecho 0, 1, 2) não está disparando a criação de novos blocos lógicos, resultando em cargas de destinos diferentes agrupadas sob a mesma origem.1.6. Erro de Unidade de Medida: O peso bruto extraído em KG não está sofrendo a conversão mandatória para TON, gerando valores de carga irreais no plano de deck.1.7. Inconsistência de Separadores: O parser de dimensões falha ao encontrar variações entre vírgulas e pontos (ex: 2,30 vs 2.30), resultando em erros de cálculo de área ocupada.
2. Funções Corrigidas e Lógica de ImplementaçãoAs funções abaixo foram refatoradas para garantir a precisão da extração, utilizando processamento de linguagem natural e expressões regulares avançadas.2.1. extrair_origem_destino()Implementação de busca por âncoras textuais que capturam a string completa até o próximo delimitador de linha, garantindo que nomes como PACU PORTO DO AÇU e NS44 LAGUNA STAR sejam registrados integralmente.2.2. detectar_novos_trechos()O sistema agora monitora a ocorrência da string Nº Trecho seguida de numeral. Cada detecção encerra o contexto atual e inicia um novo bloco de dados, resetando as variáveis de origem e destino conforme o cabeçalho da nova seção.2.3. extrair_codigo_identificador()Utilização de Regex otimizada: [A-Z]{1,4}\d{4,9}. A função agora varre toda a descrição. Foi adicionada uma Negative Lookbehind para ignorar qualquer sequência numérica que venha após os termos ESL. ou ESLINGA.2.4. extrair_dimensoes()Normalização de strings de dimensão. O algoritmo substitui vírgulas por pontos e remove espaços antes de converter para o formato decimal padrão C x L x A.2.5. converter_peso()Aplicação da fórmula matemática para conversão de unidade:peso_ton=peso_kg1000peso\_ton = \frac{peso\_kg}{1000}peso_ton=1000peso_kg​2.6. validar_carga()Camada de integridade que verifica se os campos codigo_identificador, peso_ton e dimensoes foram preenchidos. Caso contrário, a carga é marcada para revisão manual.2.7. processar_arquivo()Pipeline unificado que coordena o pré-processamento da imagem (OpenCV), OCR (PaddleOCR) e a aplicação das funções de limpeza e validação descritas acima.
3. Exemplo de Saída JSON EstruturadaAbaixo, o modelo de objeto esperado após o processamento correto de uma linha de manifesto:
```json
{
  "item_manifesto": {
    "numero_carga": "0059",
    "codigo_identificador": "14097732",
    "origem": "PACU PORTO DO AÇU",
    "destino": "NS44 LAGUNA STAR",
    "descricao_completa": "CONTAINER DE FERRAMENTAS OFFSHORE",
    "peso_ton": 1.50,
    "dimensoes": {
      "comprimento": 2.30,
      "largura": 1.30,
      "altura": 2.20,
      "formatado": "2.30x1.30x2.20"
    },
    "status_validacao": "sucesso"
  }
}
```4. Checklist de Testes e HomologaçãoPara garantir a estabilidade da solução, os seguintes testes devem ser executados no ambiente de homologação:
Executar extração em lote de 4 arquivos PDF (2 texto, 2 imagem/escaneado).
Validar conversão matemática: 450.000 KG deve resultar em exatamente 450.00 TON.
Confirmar captura de códigos identificadores em 3 posições: início, meio e fim da descrição.
Verificar se números após ESL. ou ESLINGA foram corretamente descartados.
Testar manifestos com múltiplos trechos para confirmar a separação de seções.
Validar normalização de dimensões com entradas contendo vírgulas (ex: 1,5x2,0).