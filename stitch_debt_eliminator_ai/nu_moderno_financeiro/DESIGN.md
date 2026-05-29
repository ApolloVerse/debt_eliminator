---
name: Nu-Moderno Financeiro
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#4f4253'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#817284'
  outline-variant: '#d3c1d5'
  surface-tint: '#941cc7'
  primary: '#670090'
  on-primary: '#ffffff'
  primary-container: '#8a05be'
  on-primary-container: '#edb9ff'
  inverse-primary: '#eab2ff'
  secondary: '#495f84'
  on-secondary: '#ffffff'
  secondary-container: '#bcd2fe'
  on-secondary-container: '#445a7f'
  tertiary: '#004832'
  on-tertiary: '#ffffff'
  tertiary-container: '#006246'
  on-tertiary-container: '#00e6a9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f7d8ff'
  primary-fixed-dim: '#eab2ff'
  on-primary-fixed: '#320047'
  on-primary-fixed-variant: '#7400a0'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#b1c7f2'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#31476b'
  tertiary-fixed: '#3effbf'
  tertiary-fixed-dim: '#00e1a5'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#005139'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  titulo-xl:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  titulo-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  titulo-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  corpo-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  corpo-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  corpo-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  legenda:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  botao:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  titulo-xl-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unidade: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
---

## Brand & Style

The design system is rooted in the "Modern Brazilian Fintech" aesthetic: a blend of high-energy color and disciplined, clean layouts. It prioritizes clarity and immediate visual feedback, reflecting a brand that is transparent, innovative, and deeply human. 

The style combines **Minimalism** with subtle **Glassmorphism** to create a sense of lightness and technical sophistication. The emotional goal is to move away from the "heavy" feeling of traditional banking toward an experience that feels as fluid and responsive as a social media app, without sacrificing the gravitas of financial security.

## Colors

A paleta de cores é vibrante e intencional:
- **Primária (Roxo Nubank):** Utilizada para ações principais, destaques de marca e estados ativos. Transmite energia e inovação.
- **Secundária (Azul Profundo):** Reservada para tipografia de alta hierarquia e elementos estruturais. Garante a legibilidade e o tom "trustworthy".
- **Terciária (Menta Suave):** Focada em indicadores de sucesso, progresso positivo e rendimentos. 
- **Neutros:** Tons de cinza ultra-leves e branco puro são usados para criar camadas de separação e manter a interface arejada.

**Paleta Funcional:**
- `sucesso`: #00F5B4 (Menta)
- `erro`: #F44336
- `alerta`: #FFC107
- `fundo`: #FFFFFF
- `superficie`: #F5F7FA

## Typography

Utilizamos uma combinação de duas fontes para equilibrar personalidade e funcionalidade:
- **Outfit:** Usada em títulos e chamadas (Headlines). Sua geometria moderna e amigável reforça o tom inovador do design system.
- **Inter:** Usada para todo o corpo de texto, tabelas e formulários. Sua clareza sistemática é essencial para a leitura de dados financeiros complexos.

O escalonamento tipográfico deve ser seguido rigorosamente para manter a hierarquia visual. Títulos maiores utilizam um kerning ligeiramente mais fechado (-0.02em) para um aspecto mais premium.

## Layout & Spacing

Este design system utiliza um sistema de grade modular baseado em 4px. 

- **Desktop:** Grade de 12 colunas com largura máxima de 1200px. Gutter fixo de 24px.
- **Mobile:** Grade de 4 colunas com margens laterais de 20px. 

O espaçamento entre elementos deve priorizar o agrupamento lógico (contiguidade). Use `32px (xl)` para separar seções principais e `16px (md)` para elementos dentro de um mesmo card. O "respiro" é fundamental para transmitir a sensação de limpeza e organização financeira.

## Elevation & Depth

A profundidade é comunicada através de **Camadas Tonais** e **Sombras Difusas**. Não utilizamos sombras pretas puras; as sombras devem ser tingidas com a cor secundária (Azul Profundo) em opacidade muito baixa (ex: 4-8%) para evitar um aspecto sujo.

1. **Nível 0 (Fundo):** #FFFFFF.
2. **Nível 1 (Cards/Superfícies):** #F5F7FA ou Branco com sombra suave.
3. **Nível 2 (Popovers/Modais):** Sombra mais profunda com 16px de blur, criando foco imediato.

O efeito de glassmorphism deve ser aplicado apenas em elementos flutuantes (como barras de navegação superiores no scroll) usando um `backdrop-filter: blur(10px)`.

## Shapes

A linguagem de formas é arredondada e acolhedora. 
- **Componentes Padrão (Inputs, Botões pequenos):** 8px (0.5rem).
- **Cards e Containers principais:** 16px (1rem).
- **Modais e Seções de destaque:** 24px (1.5rem).

Evitamos cantos vivos para manter a estética amigável e moderna. Elementos interativos (chips e tags) podem utilizar o formato "pill" (totalmente arredondado) para se diferenciarem de botões de ação primários.

## Components

- **Botões (Primary):** Fundo Roxo (#8A05BE), texto Branco, cantos de 8px a 12px. Hover deve aplicar um leve escurecimento ou sombra interna.
- **Cards:** Fundo Branco, borda de 1px em cinza ultra-claro ou sombra suave. O padding interno deve ser generoso (24px).
- **Inputs:** Bordas sutis, fundo levemente acinzentado (#F5F7FA). O foco (active state) deve destacar a borda em Roxo com um anel de brilho suave (glow).
- **Chips de Status:** Usam a cor Menta (#00F5B4) com texto em Azul Profundo para estados positivos ("Concluído", "Recebido").
- **Listas de Transações:** Layout limpo com ícones circulares à esquerda, descrição em `corpo-md` e valores à direita em negrito.
- **Ícones:** Linhas finas (2px stroke), geométricos, sempre acompanhando a cor do texto ou a cor primária para ações.