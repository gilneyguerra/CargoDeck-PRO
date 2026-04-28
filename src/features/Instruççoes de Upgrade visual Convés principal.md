INSTRUÇÕES DE UPGRADE VISUAL: PÁGINA DO CONVÉS PRINCIPAL
Guia Técnico de Implementação de Design System e Padronização de UI/UX27 de abril de 20261. 
Visão Geral
Este documento estabelece as diretrizes técnicas para a modernização visual da Página do Convés Principal. O objetivo central é alinhar a interface de operação aos padrões estéticos e de usabilidade da nova Landing Page, garantindo uma transição fluida para o usuário entre as áreas institucionais e operacionais do sistema.O estado atual da página apresenta cores legadas, espaçamentos inconsistentes e ausência de profundidade visual (sombras e camadas). O estado alvo exige uma interface profissional, limpa e responsiva. Restrição Crítica: Este upgrade é estritamente visual. Nenhuma funcionalidade de backend, lógica de drag-and-drop, persistência de dados ou estrutura de eventos JavaScript deve ser alterada ou removida.
Atenção: A preservação da integridade dos seletores (IDs e Classes) utilizados pelos scripts de alocação de carga é mandatória para evitar a quebra da ferramenta operacional.
2. Paleta de Cores a AplicarA implementação deve utilizar as variáveis de cores definidas no Design System da marca para garantir consistência visual em toda a plataforma.Primárias Marítimas:
Azul Marítimo: #003366 (Identidade e Headers)
Azul Ação: #0056B3 (Interações e Links)
Laranja Destaque: #FF8C00 (Alertas e CTAs secundários)
Neutras e Backgrounds:
Texto Principal: #1A1A1A (Alta legibilidade)
Texto Secundário: #555555 (Descrições e labels)
Background Light: #F8F9FA (Fundo de página)
Background Dark: #0A192F (Footers e áreas de contraste)
Status e Feedback:
Sucesso: #388E3C
Alerta: #F57C00
Erro: #D32F2F
3. Componentes a Atualizar3.1 Header e NavegaçãoO cabeçalho deve ser transformado em um elemento fixo com efeito de transparência moderna, garantindo que as ferramentas de navegação estejam sempre acessíveis.
```css
header.navbar {
  position: sticky;
  top: 0;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 100;
  transition: all 0.3s ease-in-out;
}.navbar-logo {
color: #003366;
font-weight: 700;
font-size: 1.5rem;
}.navbar-links a {
color: #1A1A1A;
text-decoration: none;
transition: color 0.3s ease-out;
position: relative;
}.navbar-links a:hover {
color: #0056B3;
}
#### 3.2 Container do Convés (Main Layout)

<p style="text-align: justify;">Substituir o fundo branco puro por um tom neutro leve para destacar os cards de alocação e melhorar o conforto visual durante operações prolongadas.</p>
```css
main.deck-container {
  background-color: #F8F9FA;<br/>
  padding: 80px 40px;<br/>
  min-height: calc(100vh - 80px);
}

.deck-title {
  color: #003366;<br/>
  font-size: 2.5rem;<br/>
  font-weight: 700;<br/>
  margin-bottom: 24px;<br/>
  position: relative;<br/>
  padding-bottom: 16px;
}

.deck-title::after {<br/>
  content: '';<br/>
  position: absolute;<br/>
  bottom: 0;<br/>
  left: 0;<br/>
  width: 60px;<br/>
  height: 4px;<br/>
  background: linear-gradient(90deg, #0056B3, #FF8C00);<br/>
  border-radius: 2px;
}3.3 Cards e Baias de AlocaçãoAs baias devem possuir bordas arredondadas e sombras suaves que reagem ao hover, indicando áreas interativas para o usuário.
```css
.baia, .deck-card {
  background: #FFFFFF;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.06);
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: grab;
}.baia:hover, .deck-card:hover {
box-shadow: 0 10px 30px rgba(0,0,0,0.12);
transform: translateY(-4px);
border-color: rgba(0,86,179,0.2);
}
#### 3.4 Itens de Carga (Drag & Drop)

<p style="text-align: justify;">Os itens móveis devem ser visualmente distintos, utilizando gradientes marítimos e sombras de elevação para facilitar a identificação durante o arraste.</p>
```css
.item, .container-item {
  background: linear-gradient(135deg, #003366, #0056B3);<br/>
  color: #FFFFFF;<br/>
  padding: 16px;<br/>
  border-radius: 8px;<br/>
  margin-bottom: 12px;<br/>
  cursor: move;<br/>
  box-shadow: 0 2px 8px rgba(0,86,179,0.15);
}

.item.dragging {
  opacity: 0.8;<br/>
  box-shadow: 0 20px 40px rgba(0,86,179,0.4);<br/>
  transform: scale(1.02) rotate(2deg);
}3.5 Botões e Controles Operacionaiscss123456789101112131415button.btn-primary {
  background-color: #0056B3;<br/>
  color: #FFFFFF;<br/>
  padding: 12px 24px;<br/>
  border-radius: 8px;<br/>
  font-weight: 600;<br/>
  border: none;<br/>
  transition: all 0.3s ease;
}

button.btn-primary:hover {<br/>
  background-color: #003D8F;<br/>
  transform: translateY(-2px);<br/>
  box-shadow: 0 6px 20px rgba(0,86,179,0.25);
}4. Tipografia GlobalA hierarquia tipográfica deve ser rigorosamente aplicada para organizar a densidade de informações da página operacional.
```css
h1 { color: #003366; font-size: 3.5rem; font-weight: 700; letter-spacing: -0.02em; }
h2 { color: #003366; font-size: 2.5rem; font-weight: 700; }
h3 { color: #1A1A1A; font-size: 1.5rem; font-weight: 700; }
p { color: #555555; font-size: 1rem; line-height: 1.6; }
```5. Responsividade (Mobile First)A interface deve se adaptar automaticamente a diferentes dispositivos, priorizando a visualização em tablets e desktops para operações de carga.
```css
@media (max-width: 768px) {
  .deck-container { padding: 40px 20px; }
  .deck-title { font-size: 1.75rem; }
  .features-grid { grid-template-columns: 1fr; }
}@media (min-width: 1024px) {
.features-grid { grid-template-columns: repeat(3, 1fr); }
}
### 6. Preservação de Funcionalidades Backend

<blockquote style="border-left: 3px solid #424242; padding: 8px 16px; margin: 12px 0; background-color: #FAFAFA;"><br/>
<p style="margin: 0; font-size: 13px; color: #333333; font-style: italic;">"A estética nunca deve comprometer a operação. O código visual deve envolver a lógica existente sem sufocá-la."</p>
</blockquote>

<p style="text-align: justify;">As seguintes funções e comportamentos <strong>não podem ser alterados</strong>:</p>

1. **Eventos de Drag:** `dragStart()`, `dragOver()`, `drop()`.<br/>
2. **Lógica de Persistência:** `saveDeckState()`, `loadDeckState()` e chamadas ao `localStorage`.<br/>
3. **Atributos de Dados:** Todos os `data-id`, `data-weight` e `id` únicos dos elementos.<br/>
4. **Estrutura de DOM:** A ordem de aninhamento de containers que o JavaScript utiliza para cálculos de posição.

### 7. Checklist de Implementação

- [ ] Injeção das variáveis CSS no `:root` do projeto.
- [ ] Atualização do Header com efeito de desfoque (backdrop-filter).
- [ ] Aplicação de gradientes marítimos nos itens de carga.
- [ ] Implementação de estados de *hover* e *active* em todos os botões.
- [ ] Verificação de contraste WCAG AA para acessibilidade.
- [ ] Teste de regressão da funcionalidade de *drag-and-drop*.
- [ ] Validação da persistência de dados após o upgrade visual.

### 8. Instruções Finais para Antigravity

<p style="text-align: justify;">Para executar este upgrade, o agente deve criar um novo arquivo de folha de estilo (ex: `deck-upgrade.css`) e referenciá-lo no cabeçalho HTML após os estilos legados. Isso garantirá que as novas regras sobrescrevam as antigas sem a necessidade de deletar o código original imediatamente, facilitando um eventual <em>rollback</em>.</p>

<p style="text-align: justify;">Após a aplicação do CSS, realize um teste de estresse movendo múltiplos itens simultaneamente para garantir que as transições e sombras não causem <em>lag</em> na interface do usuário.</p>

---