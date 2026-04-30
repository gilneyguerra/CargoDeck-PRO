ESPECIFICAÇÃO TÉCNICA: EXTRAÇÃO DE MANIFESTOS VIA CHAT INTERATIVO
Implementação de Pipeline de Extração Multi-Modelo (LLM) com Interface Conversacional
29 de abril de 2026

1. BRIEFING EXECUTIVO
O projeto CargoDeck Plan enfrenta desafios críticos na extração de dados de manifestos de carga quando os arquivos PDF são escaneados ou possuem layouts altamente complexos. A abordagem tradicional de OCR (Optical Character Recognition) estático apresenta inconsistências de leitura e falhas de interpretação de contexto. Esta especificação propõe a substituição do fluxo passivo por uma Interface de Chat Interativo baseada em LLMs (Large Language Models) de última geração.
A solução utiliza um ecossistema multi-modelo (Nemotron, Minimax, BigPickle e Gemini) para garantir uma acurácia superior a 95%. O agente atua como um mediador inteligente que não apenas extrai dados, mas valida inconsistências em tempo real com o usuário, reduzindo o reprocessamento manual em 80% e elevando significativamente a experiência do usuário (UX).
2. ARQUITETURA TÉCNICA
A arquitetura baseia-se em um Intelligent LLM Router que distribui tarefas específicas para o modelo mais apto, otimizando custo e precisão:
●	Nemotron 3 Super (RCA): Responsável pelo raciocínio lógico complexo e identificação de mudanças de seção (Origem/Destino).
●	Minimax M2.5: Especializado em estruturação de dados brutos para JSON e normalização de entidades.
●	BigPickle Mentor: Atua na interface de suporte, explicando falhas e orientando o usuário sobre como proceder com documentos ilegíveis.
●	Gemini 3 Flash: Utilizado para processamento de alta velocidade e análise inicial de grandes volumes de texto/contexto.
Variáveis de Ambiente Necessárias:

●	NEMOTRON_API_KEY: Acesso ao provedor de inferência.
●	MINIMAX_GROUP_ID / MINIMAX_API_KEY: Credenciais para estruturação de dados.
●	BIGPICKLE_AUTH_TOKEN: Token para o módulo de mentoria.
●	GEMINI_API_KEY: Chave para processamento de contexto rápido.
●	LLM_ROUTER_STRATEGY: Define a prioridade entre custo e precisão.
3. DADOS DO MANIFESTO A EXTRAIR
O extrator deve mapear obrigatoriamente os seguintes campos, mantendo a integridade referencial entre as páginas do documento:
●	DADOS GERAIS: Nome do Navio, Equipamento (Nº de Série), Data da Operação, Hora, Base de Origem e Empresa Responsável.
●	ROTA DINÂMICA: Identificação de cada par ORIGEM / DESTINO (ex: PACU -> NS44). O sistema deve detectar mudanças de rota no meio do documento (ex: BMAC -> NS32) e atribuir as cargas subsequentes ao novo destino.
●	CARGAS (LINHA-A-LINHA):Número: Sequencial do manifesto (ex: 0044).
●	Descrição: Texto descritivo da carga.
●	Código ID Único: Identificador alfanumérico (ex: ABC 123456). Regra: Ignorar números após "ESL." ou "ESLINGA".
●	Dimensões: Comprimento x Largura x Altura (em metros).
●	Peso: Extrair em KG e converter obrigatoriamente para TON ($$Peso_{ton} = \frac{Peso_{kg}}{1000}$$).
●	CAMPOS OPCIONAIS: Empresa gerenciadora da carga e notas especiais de manuseio.
4. FLUXO DE CONVERSAÇÃO
1.	Início: O usuário aciona o botão "Importar via Chat" na sidebar de cargas.
2.	Abertura: Um modal de chat centralizado é exibido. O agente (BigPickle) se apresenta: "Olá! Sou seu assistente de importação. Por favor, cole o conteúdo do manifesto ou faça o upload do arquivo."
3.	Input: O usuário fornece os dados (texto copiado ou arquivo).
4.	Análise: O Router aciona o Gemini para identificar o formato. Se for imagem, solicita processamento OCR via backend e retorna o texto para o chat.
5.	Extração: O Minimax processa o texto e apresenta um resumo: "Identifiquei 15 cargas para o destino NS44 e 10 cargas para NS32. Posso prosseguir com a estruturação?"
6.	Validação: O usuário confirma ou corrige: "A carga 0050 na verdade pesa 5000kg". O agente ajusta instantaneamente.
7.	Finalização: O agente gera o JSON final e o CargoDeck importa as cargas para a área de "Cargas Não Alocadas".
5. COMPONENTE REACT: ManifestoImportChat
// Estrutura sugerida para o componente const ManifestoImportChat = ({ onImportComplete }) => {   const [messages, setMessages] = useState([]);   const [isProcessing, setIsProcessing] = useState(false);   const { extract, validate } = useManifestoExtraction();    const handleSendMessage = async (input) => {     // 1. Adicionar mensagem do usuário ao state     // 2. Chamar LLM Router (Gemini/Minimax)     // 3. Processar resposta e atualizar UI     // 4. Se JSON estruturado for detectado, exibir preview de tabela   };    return (     <Modal title="Assistente de Importação Inteligente">       <ChatContainer>         <MessageList messages={messages} />         <InputArea onSend={handleSendMessage} disabled={isProcessing} />       </ChatContainer>       {hasStructuredData && <PreviewTable data={extractedData} />}     </Modal>   ); };
6. PROMPTS DO AGENTE (SYSTEM PROMPTS)
PROMPT_EXTRATOR (Minimax/Nemotron):

"Você é um especialista em logística offshore. Sua tarefa é extrair dados de manifestos de carga. Identifique blocos de ORIGEM e DESTINO. Para cada carga, extraia: ID, Descrição, Dimensões (CxLxA) e Peso. Converta pesos de KG para TON. Ignore números de série de eslingas (prefixo ESL). Retorne APENAS um JSON estruturado."
PROMPT_VALIDADOR (Nemotron):
"Analise o JSON extraído. Verifique se as dimensões são realistas para cargas de convés (0.1m a 20m). Verifique se o peso em TON está coerente. Se houver duplicatas de Código ID, sinalize. Retorne uma lista de inconsistências ou 'VALIDADO'."
PROMPT_MENTOR (BigPickle):
"Você é o Mentor do CargoDeck. Ajude o usuário a resolver problemas de importação. Se o texto estiver confuso, peça para o usuário verificar a página X do PDF. Seja cordial, técnico e focado em produtividade marítima."
7. INTEGRAÇÃO DE APIS E ROUTER
O sistema deve implementar um Provider Pattern para gerenciar as chamadas de API. O Router deve seguir a lógica de fallback:
●	Tarefa de Parsing: Prioridade Minimax M2.5 -> Fallback Gemini 3 Flash.
●	Tarefa de Raciocínio (Mudança de Rota): Prioridade Nemotron 3 Super -> Fallback Minimax.
●	Tarefa de Chat/UX: Prioridade BigPickle -> Fallback Gemini.
Tratamento de Rate Limits: Implementar Exponential Backoff com limite de 3 tentativas antes de alternar para o modelo de fallback.
8. ESTRUTURA JSON DE SAÍDA
{   "naveData": {<br/>     "nome": "Skandi Amazonas",<br/>     "equipamento": "Crane 01",<br/>     "data": "2026-04-29",<br/>     "hora": "14:30",<br/>     "base": "Porto do Açu",<br/>     "empresa": "Petrobras"   },   "rotaData": {<br/>     "origem": "PACU",<br/>     "destino": "NS44",<br/>     "mudancasSequenciais": [<br/>       {"pagina": 2, "novaOrigem": "BMAC", "novoDestino": "NS32"}     ]   },   "cargasArray": [     {       "numero": "0044",<br/>       "descricao": "CONTAINER 10FT C/ EQUIPAMENTOS",<br/>       "codigoID": "CONT-998822",<br/>       "dimensoes": {"c": 3.0, "l": 2.4, "a": 2.6},<br/>       "peso_ton": 4.5,<br/>       "destinoFinal": "NS44"     }   ],   "metadadosExtracao": {<br/>     "llmUsado": "Minimax-M2.5",<br/>     "confiancaScore": 0.98,<br/>     "revisoesSugeridas": []   } }
9. TRATAMENTO DE ERROS E EDGE CASES
●	PDF Ilegível: O BigPickle deve solicitar: "A imagem está muito ruidosa. Poderia digitar manualmente as cargas da página 2?"
●	Ambiguidade de Código: Se encontrar dois códigos (ex: ABC-123 e XYZ-999), o chat pergunta: "Qual destes é o identificador da carga?"
●	Timeout de API: O sistema deve exibir um Skeleton Loader e tentar o modelo de fallback automaticamente após 10 segundos.
●	Pesos Absurdos: Se uma carga de 2 metros pesar 500 toneladas, o Validador deve emitir um alerta visual no chat.
10. VALIDAÇÕES DE NEGÓCIO
●	Geofencing de Rota: Origem e Destino devem pertencer ao dicionário de bases cadastradas no CargoDeck.
●	Integridade de Container: Validar ISO 6346 (4 letras + 7 números) para códigos identificadores de containers.
●	Deteção de Duplicatas: Gerar um hash SHA-256 combinando codigoID + peso_ton + destino. Se o hash já existir no banco, marcar como "Duplicata Provável".
11. HOOKS E UTILITIES
●	useManifestoExtraction(): Gerencia o estado da conversa, histórico de mensagens e o objeto JSON temporário.
●	extractManifestoJSON(text): Regex e parsers para limpar a resposta da LLM e garantir um objeto JavaScript válido.
●	validateManifestoData(data): Executa as regras de negócio da Seção 10.
●	transformToCargoObject(json): Mapeia os campos do manifesto para o esquema interno da classe Cargo do CargoDeck.
12. INTEGRAÇÃO COM CARGODECK
Após a confirmação no chat, o JSON é enviado para o Global State (Context/Redux). As cargas aparecem instantaneamente na Sidebar de Cargas Disponíveis, categorizadas por Destino. O sistema deve disparar um evento de Highlight visual nas novas cargas para facilitar a localização pelo usuário.
13. TESTES
●	Unitários: Validar a função de conversão KG -> TON com diferentes formatos de entrada (vírgula, ponto, espaços).
●	Prompt Testing: Testar o PROMPT_EXTRATOR com 20 variações de manifestos reais para medir a taxa de alucinação.
●	E2E: Simular um fluxo completo de upload -> chat -> correção -> importação usando o ambiente de staging.
14. CRONOGRAMA E ROADMAP
●	Fase 1 (Dias 1-2): Configuração de infraestrutura de APIs e implementação do Router Multi-Modelo.
●	Fase 2 (Dias 3-4): Desenvolvimento do componente ManifestoImportChat e integração dos System Prompts.
●	Fase 3 (Dias 5-6): Implementação dos Hooks de validação e integração com o estado global do CargoDeck.
●	Fase 4 (Dia 7): Testes de stress, refinamento de UX e Deploy em Produção.
15. CHECKLIST DE IMPLEMENTAÇÃO
8.	 API Keys configuradas no .env.
9.	 Router de LLM tratando fallbacks corretamente.
10.	 Prompt de extração ignorando números de eslingas.
11.	 Conversão KG para TON validada.
12.	 Detecção de mudança de rota (Origem/Destino) funcional.
13.	 Interface de chat com suporte a Markdown.
14.	 Preview de tabela antes da importação final.
15.	 Validação de dimensões realistas implementada.
16.	 Hash SHA-256 para duplicatas ativo.
17.	 Componente React responsivo e centralizado.
18.	 Tratamento de erro para PDF protegido por senha.
19.	 Logs de extração para auditoria de acurácia.
20.	 Suporte a "copiar e colar" texto direto no chat.
21.	 Notificação de sucesso após importação.
22.	 Botão de "Cancelar" limpa o estado temporário.
23.	 BigPickle Mentor respondendo dúvidas operacionais.
24.	 Validação de códigos ISO 6346.
25.	 Skeleton loaders durante chamadas de API.
26.	 Persistência de histórico de chat durante a sessão.
27.	 Documentação de uso atualizada no FAQ do app.
