# 🧁 StockSweet

Sistema de gestão de estoque e precificação inteligente para confeitarias de pequeno e médio porte.

Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC) do curso Técnico em Desenvolvimento de Sistemas — modalidade EaD, SEAD/CGTEC.

---

## 📋 Sobre o projeto

Confeitarias pequenas e médias lidam diariamente com insumos perecíveis e preços de matéria-prima que oscilam com frequência, o que torna difícil saber, na prática, quanto custa produzir cada doce. O **StockSweet**  vai automatiza o controle de insumos e o cálculo de custos de produção, com o objetivo de reduzir o desperdício de matéria-prima e maximizar a margem de lucro do negócio.

De forma geral, o sistema permite:
- Cadastrar fornecedores e receitas (fichas técnicas), vinculando cada insumo à quantidade usada em cada doce;
- Calcular automaticamente o custo de produção a partir desses dados;
- Sugerir um preço de venda com base na margem de lucro definida pelo gestor;
- Emitir alertas sempre que um insumo estiver com estoque abaixo do nível mínimo cadastrado.

### Impacto social e ODS relacionados
- **ODS 8** — Trabalho Decente e Crescimento Econômico (saúde financeira de pequenos negócios)
- **ODS 12** — Consumo e Produção Responsáveis (redução de desperdício de alimentos)

---

## 🛠️ Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Front-end | HTML, CSS e JavaScript |
| Back-end | C# (.NET / ASP.NET Core Web API) |
| Banco de dados | MySQL |
| Prototipação de telas | Android Studio (mockups/validação de fluxos durante as sprints) |
| Metodologia de desenvolvimento | Scrum |

> O sistema é entregue como aplicação web, acessível via navegador em desktop e mobile, sem exigir instalação (RNF05). O Android Studio é usado apenas na etapa de prototipação e validação de telas, não como tecnologia de implantação do produto final.

---

## 👥 Equipe

| Integrante | Papel |
|---|---|
| Michael Ronald Moraes Sousa Lindoso | Product Owner |
| Pietro Alves Ferreira | Scrum Master |
| Alice Araujo Moreira da Silva | Development Team |
| Matheus Rocha Souza | Development Team |
| Osvaldo Kenmei Saito | Development Team |

**Orientador:** Prof. Analder Magalhães Honorio

---

## 🎯 Requisitos funcionais

| ID | Requisito | Descrição |
|---|---|---|
| RF01 | Cadastrar Fornecedores | Registro de parceiros comerciais e seus contatos |
| RF02 | Cadastrar Insumos | Registro de ingredientes com unidade de medida e preço de compra |
| RF03 | Cadastrar Receitas | Elaboração de fichas técnicas vinculando insumos e quantidades |
| RF04 | Cálculo de Custos | Processamento automático do valor de produção com base nos insumos |
| RF05 | Sugestão de Preço | Sugestão de valor de venda com base na margem de lucro definida |
| RF06 | Alertas de Sistema | Notificações automáticas quando um insumo atinge o nível mínimo de estoque |
| RF07 | Consultar Relatório de Saldo | Visualização em tempo real das quantidades disponíveis de cada insumo |
| RF08 | Definir Margem de Lucro | Configuração da porcentagem de ganho desejada sobre os produtos |

## 🔒 Requisitos não funcionais

| ID | Requisito | Descrição |
|---|---|---|
| RNF01 | Segurança e Controle de Acesso | Restrição de funcionalidades por perfil (Usuário x Gestor); apenas o Gestor acessa margem de lucro e relatórios de saldo |
| RNF02 | Usabilidade | Interface simples e intuitiva, no máximo 3 cliques para operações mais frequentes |
| RNF03 | Desempenho | Cálculo de custo e sugestão de preço processados em até 3 segundos |
| RNF04 | Disponibilidade e Backup | Armazenamento com rotina de backup em nuvem |
| RNF05 | Compatibilidade | Acessível via navegador web em desktop e mobile, sem exigir instalação |
| RNF06 | Baixo Custo de Manutenção | Infraestrutura com custo operacional reduzido, compatível com o orçamento de um pequeno confeiteiro |

---

## 🧩 Casos de uso

O sistema possui dois atores: **Usuário** e **Gestor** (Gestor herda todos os casos de uso do Usuário).

**Usuário**
- Cadastrar insumos
- Cadastrar fornecedores
- Movimentar estoque (entradas e saídas)
- Cadastrar receitas
- Receber alertas de estoque baixo

**Gestor** (além dos casos de uso do Usuário)
- Consultar relatório de saldo
- Sugestão de preço
- Definir margem de lucro

---

## 🗂️ Modelo de dados

Principais entidades do sistema:

- **Usuario** — idUser, numeroUsuario, nome, email, senha
- **Gestor** — herda de Usuario; possui `funcionarios: int` e métodos de cálculo/consulta
- **Fornecedor** — idFornecedor, nome, telefone, email, endereço, observação
- **Insumos** — idInsumo, nome, unidadeMedida, quantidadeEstoque, precoCompra, estoqueMinimo
- **Receita** — idReceita, nome, descricao, rendimentoReceita, dataCadastro
- **ItemReceita** — idItem, quantidade, valorItem (associa Insumos a uma Receita)
- **MovimentacaoEstoque** — idMovimentacao, tipo (ENTRADA/SAIDA), data, quantidade, valorUnitario, observacao
- **Precificacao** — idPrecificacao, margemLucro, precoSugerido, custoProducao, dataCalculo

---

## 🏃 Metodologia de desenvolvimento (Scrum)

O projeto é conduzido em 5 sprints, cada uma correspondente a um módulo funcional:

| Sprint | Módulo |
|---|---|
| 1 | Cadastro de insumos e fornecedores |
| 2 | Controle de estoque (entradas e saídas) |
| 3 | Sistema de alertas e relatório de saldo |
| 4 | Cadastro de receitas e associação de insumos |
| 5 | Lógica de precificação (margem de lucro e cálculo automático de custos) |

Reuniões de **Daily Scrum** são realizadas ao longo de cada sprint para registro de impedimentos e planos de ação.

---

## 🚀 Como executar o projeto

> Ajuste os comandos abaixo conforme a estrutura real de pastas do repositório.

### Pré-requisitos
- [.NET SDK](https://dotnet.microsoft.com/) (versão utilizada no back-end)
- [MySQL](https://www.mysql.com/) instalado e em execução
- Qualquer servidor de arquivos estáticos para o front-end (ex: extensão Live Server do VS Code, `npx serve` ou `python -m http.server`)

### Back-end (C# / .NET)
Cada dev roda seu **próprio MySQL local** (não é um banco compartilhado) e usa as migrations do EF Core pra ter o mesmo schema. A connection string e a chave do JWT ficam fora do repositório, configuradas via `dotnet user-secrets` (nunca em `appsettings.json`):

```bash
cd backend/StockSweet.Api
dotnet restore
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:MySql" "server=127.0.0.1;port=3306;database=stocksweet_db;user=root;password=SUA_SENHA;"
dotnet user-secrets set "JwtConfig:Key" "uma-chave-aleatoria-qualquer-com-32+-chars"
dotnet ef database update   # cria o banco (se não existir) e aplica as migrations
dotnet run
```

### Front-end (HTML, CSS e JavaScript)
O front-end é estático (sem build/bundler) e consome a API via `fetch`. Basta servir a pasta `frontend/` em `http://localhost:5173` (porta já liberada no CORS do back-end):
```bash
cd frontend
npx serve -l 5173
# ou: python -m http.server 5173
```
A URL base da API é configurada em `frontend/js/config.js`.

### Banco de dados
1. Crie um banco MySQL (ex: `stocksweet_db`);
2. Configure a connection string no `appsettings.json` (ou `.env` equivalente) do back-end;
3. Rode as migrations/scripts de criação das tabelas descritas em [Modelo de dados](#-modelo-de-dados).

---

## 📁 Estrutura de pastas (sugerida)

```
stocksweet/
├── backend/          # API em C# (.NET)
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   └── Data/
├── frontend/          # Aplicação estática (HTML, CSS e JavaScript)
│   ├── css/
│   ├── js/
│   ├── assets/
│   └── index.html
└── docs/               # Declaração de Visão, diagramas, relatório técnico
```

---

## 🎓 Contexto acadêmico

Trabalho de Conclusão de Curso apresentado ao Curso Técnico em Desenvolvimento de Sistemas — modalidade EaD (SEAD/CGTEC), como requisito parcial para obtenção do título de Técnico em Desenvolvimento de Sistemas.

**Desenvolvimento:** 1º e 2º semestre de 2026
**Conclusão prevista:** novembro de 2026

