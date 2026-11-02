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
- **Receita** — idReceita, nome (único), descricao, rendimentoReceita, unidadeRendimento, dataCadastro, margemLucro (opcional: margem própria da receita, em %, que sobrepõe a padrão)
- **ItemReceita** — idItem, idReceita, idInsumo, quantidade (associa Insumos a uma Receita; a quantidade usa a unidade do insumo). O `valorItem` não é gravado: a API o calcula na hora (`quantidade × precoCompra` atual do insumo), porque o `precoCompra` muda a cada entrada de estoque
- **MovimentacaoEstoque** — idMovimentacao, tipo (ENTRADA/SAIDA), data, quantidade, valorUnitario, observacao
- **Precificacao** — idPrecificacao, idReceita, margemLucro, custoProducao, custoPorUnidade, precoSugerido (por unidade de rendimento), precoSugeridoTotal (receita inteira), idUsuario (quem calculou), dataCalculo. Cada cálculo salvo é um *snapshot* histórico e nunca é alterado
- **ConfiguracaoPrecificacao** — idConfiguracao, margemPadrao. Tem sempre **uma única linha** (a margem padrão global, valor inicial 30%), usada pelas receitas sem `margemLucro` própria

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

**Endpoints de estoque** (todos exigem `Authorization: Bearer <token>`; Usuário e Gestor podem usar):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/insumos` | Lista insumos com saldo, preço de compra e estoque mínimo |
| GET | `/api/insumos/{id}` | Detalha um insumo |
| POST | `/api/movimentacoes/entrada` | Registra entrada: `{ idInsumo, quantidade, valorUnitario, observacao? }`. Soma ao saldo e atualiza o `precoCompra` do insumo |
| POST | `/api/movimentacoes/saida` | Registra saída: `{ idInsumo, motivo, quantidade, observacao? }` (`motivo`: `PRODUCAO`, `PERDA_VALIDADE`, `AVARIA`, `OUTRO`). Retorna 400 se a quantidade passar do saldo |
| GET | `/api/movimentacoes` | Histórico (mais recentes primeiro). Filtros opcionais: `tipo` (`ENTRADA`/`SAIDA`), `idInsumo`, `de`, `ate` (`yyyy-MM-dd`), `limite` (1–200, padrão 50) |
| GET | `/api/movimentacoes/{id}` | Detalha uma movimentação |

A data e o usuário da movimentação vêm do servidor (relógio e token), não do corpo da requisição. Nas saídas, o `valorUnitario` gravado é o `precoCompra` do insumo no momento da baixa.

**Endpoints de receitas** (RF03; exigem `Authorization: Bearer <token>`; Usuário e Gestor podem usar):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/receitas` | Lista as receitas, ordenadas por nome (cada uma com `quantidadeItens`) |
| GET | `/api/receitas/{id}` | Detalha uma receita, com `quantidadeItens` e a lista `itens` (a ficha técnica). 404 se não existir |
| POST | `/api/receitas` | Cadastra: `{ nome, descricao?, rendimentoReceita, unidadeRendimento }`. Retorna 201 com a receita criada |
| PUT | `/api/receitas/{id}` | Atualiza os mesmos campos do POST. 404 se não existir |
| DELETE | `/api/receitas/{id}` | Exclui a receita (204). 404 se não existir |

`nome` (até 150 caracteres) é obrigatório e único: nome repetido retorna 409 (a comparação do MySQL ignora maiúsculas/minúsculas e acentos). `rendimentoReceita` deve ser maior que zero e `unidadeRendimento` (até 20 caracteres, ex.: `porções`, `fatias`, `kg`) é obrigatória. Campos inválidos retornam 400; a `dataCadastro` vem do servidor.

**Endpoints da ficha técnica** (RF03; mesma autenticação; Usuário e Gestor podem usar):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/receitas/{idReceita}/itens` | Lista os insumos da receita, ordenados pelo nome do insumo. 404 se a receita não existir |
| GET | `/api/receitas/{idReceita}/itens/{idItem}` | Detalha um item. 404 se a receita ou o item não existir |
| POST | `/api/receitas/{idReceita}/itens` | Adiciona um insumo: `{ idInsumo, quantidade }`. Retorna 201 com o item. 404 se a receita ou o insumo não existir, 409 se o insumo já estiver na receita |
| PUT | `/api/receitas/{idReceita}/itens/{idItem}` | Altera a quantidade: `{ quantidade }`. 404 se não existir |
| DELETE | `/api/receitas/{idReceita}/itens/{idItem}` | Remove o insumo da receita (204). 404 se não existir |

Cada item volta como `{ idItem, idInsumo, nomeInsumo, unidadeMedida, quantidade, precoCompraAtual, valorItem }`. A `quantidade` é sempre expressa na **unidade de medida do próprio insumo** (um insumo em `kg` usa quilos, um em `litros` usa litros) e deve ser maior que zero (400 caso contrário; até 3 casas decimais). O `valorItem` é calculado a cada consulta (`quantidade × precoCompraAtual`, arredondado a 2 casas) e não é gravado no banco, então acompanha as entradas de estoque que mudam o `precoCompra`. Excluir uma receita apaga a ficha técnica junto; já um insumo usado em alguma receita não pode ser excluído (a chave estrangeira é `Restrict`).

**Endpoints de custo** (RF04; mesma autenticação; Usuário e Gestor podem usar):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/receitas/{id}/custo` | Custo de produção da receita, com o custo e o percentual de cada item e a lista de alertas. 404 `{ message }` se a receita não existir |
| GET | `/api/receitas/custos` | Resumo de todas as receitas, ordenado por nome: `{ idReceita, nome, custoTotal, custoPorUnidade, quantidadeItens, possuiAlertas }` |

O custo de uma receita volta como:

```json
{
  "idReceita": 1, "nomeReceita": "Bolo de cenoura", "rendimentoReceita": 12.0, "unidadeRendimento": "fatias",
  "custoTotal": 7.05, "custoPorUnidade": 0.59, "calculadoEm": "2026-11-02T10:45:39-03:00",
  "itens": [
    { "idItem": 3, "idInsumo": 3, "nomeInsumo": "Farinha", "unidadeMedida": "kg", "quantidade": 0.5,
      "precoCompraAtual": 5.00, "custoItem": 2.50, "percentualDoCusto": 35.46 }
  ],
  "alertas": [
    { "tipo": "EstoqueInsuficiente", "mensagem": "...", "idInsumo": 5, "nomeInsumo": "Ovos", "unidadeMedida": "un", "quantidadeFaltante": 10.0 }
  ]
}
```

**Fórmula:** `custoItem = quantidade × precoCompra` do insumo; `custoTotal = Σ custoItem`; `custoPorUnidade = custoTotal ÷ rendimentoReceita` (por `unidadeRendimento`). Os cálculos usam `decimal` com os valores exatos e só o resultado é arredondado (2 casas): o `custoTotal` é a soma dos custos exatos, não a soma dos `custoItem` já arredondados, então pode diferir em centavos da soma visual das linhas. O `percentualDoCusto` também usa os valores exatos.

**Sempre ao vivo:** o custo não é gravado em tabela nenhuma (não há migration nem job). Cada leitura recalcula tudo a partir do `precoCompra` **atual** dos insumos, e como `POST /api/movimentacoes/entrada` atualiza o `precoCompra` do insumo, qualquer entrada de estoque com preço novo já aparece no custo da receita na próxima consulta. A leitura é uma única consulta ao banco (a receita com seus itens e insumos; o resumo é uma consulta agregada), sem N+1.

**Alertas** (`tipo`): `ReceitaSemItens` (a receita não tem insumos, então o custo 0 não é real), `PrecoZerado` (insumo com `precoCompra = 0`, que nunca teve entrada: o custo está subestimado) e `EstoqueInsuficiente` (o saldo do insumo é menor que a quantidade usada em **uma** receita; `quantidadeFaltante` diz quanto falta, na unidade do insumo). No resumo, `possuiAlertas` é `true` se houver qualquer um deles.

Outras funcionalidades podem reaproveitar o cálculo (por exemplo, a precificação): `CustoService.CalcularCustoReceita(int idReceita)` devolve o mesmo DTO do endpoint (ou `null` se a receita não existir) e o serviço é registrado por injeção de dependência (`AddScoped`).

**Endpoints de precificação** (RF05 + RF08; **só o Gestor**, veja [Perfis e acesso](#perfis-e-acesso-rnf01); exigem `Authorization: Bearer <token>`):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/precificacao/margem` | Margem padrão global: `{ margemPadrao }` |
| PUT | `/api/precificacao/margem` | Altera a margem padrão: `{ margemPadrao }` |
| PUT | `/api/receitas/{id}/margem` | Define a margem própria da receita: `{ margemLucro }`. Com `{ "margemLucro": null }` remove a margem própria e a receita volta a usar a padrão |
| GET | `/api/receitas/{id}/preco-sugerido` | Calcula **ao vivo** (não salva): custo, margem efetiva e sua origem, preço sugerido por unidade e total, margem real, variação do custo e alertas |
| POST | `/api/receitas/{id}/precificacao` | Faz o mesmo cálculo e **salva o snapshot** no histórico. Retorna 201 com `{ idPrecificacao, dataCalculo, calculo }` |
| GET | `/api/receitas/{id}/precificacao/historico` | Snapshots da receita, mais recentes primeiro. Parâmetro `limite` (1 a 100, padrão 20) |
| GET | `/api/precificacao` | Visão geral: todas as receitas (por nome) com custo atual, margem efetiva, preço sugerido de hoje, último preço salvo e a flag `desatualizado` |

Erros: `404 { message }` (receita inexistente), `400` (margem ou `limite` inválido; receita sem itens), `403` (usuário comum) e `401` (sem token ou token inválido).

**Fórmula (markup sobre o custo):**

```
precoSugerido      = custoPorUnidade × (1 + margem ÷ 100)     // por unidade de rendimento (fatia, porção, kg...)
precoSugeridoTotal = custoTotal      × (1 + margem ÷ 100)     // receita inteira
margemReal         = (preço − custo) ÷ preço = margem ÷ (100 + margem)
```

A `margemLucro` é um **acréscimo sobre o custo** (markup), não sobre o preço: uma margem de 30% sobre um custo de R$ 10,00 dá o preço de R$ 13,00, e desses R$ 13,00 o lucro (R$ 3,00) é só **23,08% do preço**. Por isso a resposta traz também a `margemReal` (lucro ÷ preço), para o gestor enxergar a diferença entre as duas leituras: para ficar com 30% *do preço* seria preciso um markup de ≈ 42,86%. Foi escolhido o markup por ser a conta mais simples de explicar na ficha técnica da confeitaria ("custo + 30%"); a `margemReal` existe para ela não ser confundida com a margem sobre o faturamento.

Tudo é calculado em `decimal`, sem arredondar no meio do caminho: o preço sai do custo **exato** (soma de `quantidade × precoCompra`), não do `custoPorUnidade` já arredondado, e só o resultado é arredondado a 2 casas (`MidpointRounding.AwayFromZero`). Exemplo: custo exato de R$ 9,79959 para 12 fatias e margem de 30% dá R$ 1,06 por fatia (R$ 0,8166 × 1,3); partindo do custo por unidade já arredondado (R$ 0,82) daria R$ 1,07. Pelo mesmo motivo o preço da receita inteira pode diferir em centavos de `precoSugerido × rendimento`.

**Margem efetiva:** é a margem própria da receita (`Receita.MargemLucro`) e, se ela não tiver, a margem padrão (`ConfiguracaoPrecificacao.MargemPadrao`); o cálculo informa de onde veio (`origemMargem`: `receita` ou `padrao`). Toda margem deve estar entre **0 e 999,99%**, com no máximo 2 casas decimais (400 caso contrário).

O cálculo ao vivo volta como:

```json
{
  "idReceita": 1, "nomeReceita": "Bolo de cenoura", "rendimentoReceita": 12.0, "unidadeRendimento": "fatias",
  "custoProducao": 10.62, "custoPorUnidade": 0.89,
  "margemLucro": 50.00, "origemMargem": "receita",
  "precoSugerido": 1.33, "precoSugeridoTotal": 15.93, "margemReal": 33.33,
  "variacaoCustoPercentual": 8.37, "custoUltimoCalculo": 9.80, "dataUltimoCalculo": "2026-11-02T10:57:48",
  "calculadoEm": "2026-11-02T10:57:49-03:00",
  "alertas": [
    { "tipo": "VariacaoCusto", "mensagem": "O custo subiu 8,37% desde o último cálculo (02/11/2026) — reavalie o preço." }
  ]
}
```

**Alertas e comparação com o último cálculo:** o cálculo reaproveita os alertas do custo (`ReceitaSemItens`, `PrecoZerado`, `EstoqueInsuficiente`) e compara o custo atual com o do **último snapshot salvo** da receita: `variacaoCustoPercentual` é a variação % do custo total (`null` se a receita nunca foi salva). Se o custo mudou **5% ou mais** (para cima ou para baixo) entra o alerta `VariacaoCusto`, por exemplo "O custo subiu 12% desde o último cálculo — reavalie o preço". Receita **sem itens** não tem preço: `GET .../preco-sugerido` e `POST .../precificacao` retornam 400 com mensagem. Se a receita tem itens mas todos sem preço de compra (custo total R$ 0,00), o cálculo ao vivo sai com os alertas, mas o `POST` também retorna 400, pois um preço de R$ 0,00 no histórico não serve de base para a próxima comparação.

**Visão geral (`GET /api/precificacao`):** cada linha traz o `custoProducao` e o `custoPorUnidade` de hoje, a `margemLucro` efetiva, a `origemMargem`, a `margemReceita` (a própria, se houver), o `precoSugerido` e o `precoSugeridoTotal` de hoje, `possuiAlertas`, o `ultimoPreco` salvo (`null` se nunca foi salvo) e `desatualizado`. O preço salvo está **desatualizado** quando o custo atual da receita é diferente do custo do último snapshot (sem snapshot, `false`); `variacaoCustoPercentual` mostra de quanto foi a mudança e `margemAlterada` indica que a margem efetiva de hoje não é a do último snapshot. A listagem usa 3 consultas ao banco, independente do número de receitas (sem N+1).

### Perfis e acesso (RNF01)
O perfil do usuário (`Usuario.Nivel`: `Usuario` ou `Gestor`) vai no JWT como o claim `perfil`, e o `Program.cs` o define como o tipo de *role* da autenticação (`RoleClaimType = "perfil"`). Todos os endpoints de precificação usam `[Authorize(Roles = "Gestor")]`: **sem token, 401; token de `Usuario` comum, 403; `Gestor`, acesso liberado**. Os demais endpoints (estoque, receitas e custo) continuam liberados para os dois perfis. Todo usuário nasce com o perfil `Usuario` (`POST /api/auth/register`); promover alguém a Gestor é hoje uma alteração direta no banco, `UPDATE Usuario SET Nivel = 'Gestor' WHERE Email = '...';`, e a pessoa precisa fazer login de novo para o token trazer o novo perfil.

### Front-end (HTML, CSS e JavaScript)
O front-end é estático (sem build/bundler) e consome a API via `fetch`. Basta servir a pasta `frontend/` em `http://localhost:5173` (porta já liberada no CORS do back-end):
```bash
cd frontend
npx serve -l 5173
# ou: python -m http.server 5173
```
A URL base da API é configurada em `frontend/js/config.js`.

**Fluxo de telas:** `index.html` (login) → `dashboard.html` (painel). O painel exige sessão: sem token válido no `localStorage`/`sessionStorage`, volta para o login; e quem já está logado pula o login e vai direto pro painel. O botão "Sair" limpa a sessão.

**Painel (dados fictícios):** por enquanto o painel usa dados mock gerados em `frontend/js/dashboard/mock-data.js` — quando os endpoints existirem, é ali o ponto de troca. Os gráficos são SVG desenhados à mão (sem biblioteca) e a tela respeita o perfil do usuário (RNF01): o **Gestor** vê margens, receitas, precificação e exportação do saldo; o **Usuário** vê um bloco bloqueado no lugar. No menu do usuário há um *modo demonstração* pra alternar entre os dois perfis sem precisar de outra conta.

**Movimentação de estoque (dados fictícios):** `entrada_mercadorias.html` (US02) e `saida_mercadorias.html` (US03) trazem os formulários de entrada e saída de mercadorias. Ambos usam `frontend/js/estoqueService.js`, um serviço mock que simula a API (lista de insumos, `registrarEntradaSimulada` e `registrarSaidaSimulada`, com latência e validação de quantidade/valor maior que zero). Quando os endpoints existirem, é nesse arquivo que as funções passam a fazer `fetch` para a API. Essas telas ainda não têm link no menu do painel; são abertas direto pela URL.

**Precificação (API real, só Gestor):** `precificacao.html` (RF05 + RF08) usa `frontend/js/precificacaoService.js`, que faz `fetch` nos endpoints de precificação com o token Bearer da sessão. A tela tem a **margem padrão** editável, a tabela das receitas (custo total, margem efetiva e se é própria ou padrão, preço sugerido por unidade e da receita, último preço salvo e a situação *Atualizado*, *Desatualizado* ou *Sem preço salvo*), a ação **Calcular e salvar** (mostra o resultado com os alertas, como o de variação de custo), o editor de **margem por receita** (campo vazio ou "Usar a margem padrão" remove a margem própria) e o **histórico** de preços da receita. Respeitando o perfil (`ehGestor` em `js/session.js`), quem não é Gestor vê um bloco "Acesso restrito ao Gestor" no lugar da tela e nenhuma chamada à API é feita (a API também recusa com 403). O item **Precificação** do menu do painel leva para essa tela e só aparece para o Gestor; o restante do painel continua com dados fictícios.

**Cadastro de receitas (API real):** `cadastro_receitas.html` (RF03) lista as receitas e tem o formulário de criar, editar e excluir. Diferente das telas acima, ela já chama a API de verdade: `frontend/js/receitaService.js` faz `fetch` em `/api/receitas` com o token Bearer da sessão (sem token ou com token vencido, volta pro login). O menu **Receitas** do painel leva para essa tela. O botão **Ficha técnica** de cada receita abre a lista dos insumos dela, com um formulário para adicionar insumo (o `<select>` vem de `GET /api/insumos` e mostra a unidade de medida), editar a quantidade e remover. Ao abrir a ficha aparece também o **painel de custo de produção** da receita (custo total, custo por unidade, tabela com o custo e a porcentagem de cada item e os alertas), buscado em `GET /api/receitas/{id}/custo` e atualizado sempre que um item é adicionado, editado ou removido (há ainda o botão **Recalcular**, útil depois de uma entrada de estoque). A lista de receitas ganhou as colunas **Custo total** e **Custo por unidade** (de `GET /api/receitas/custos`), com um selo *Atenção* nas receitas com alertas.

> Pra ver o painel sem subir o back-end, rode no console do navegador (na página de login) e abra `dashboard.html`:
> ```js
> sessionStorage.setItem("stocksweet.token", "x.e30.x");
> sessionStorage.setItem("stocksweet.usuario", JSON.stringify({ nome: "Seu Nome", email: "voce@exemplo.com", nivel: "Gestor" }));
> ```
> Isso só libera a tela (a checagem do front é conveniência de UX); qualquer chamada real à API continua exigindo um JWT válido.

### Banco de dados
**Banco compartilhado (recomendado para o time):** o projeto usa um MySQL gratuito no [Aiven](https://aiven.io) (serviço `stocksweet-free`, plano Free, MySQL 8.4), então o que um dev altera os outros veem. Cada dev tem o **próprio usuário** (`pietro`, `michael`, `alice`, `matheus`, `osvaldo`); host, porta e senha são passados em privado pelo Pietro e **nunca** vão pro repositório:

```bash
cd backend/StockSweet.Api
dotnet user-secrets set "ConnectionStrings:MySql" "server=HOST;port=PORTA;database=defaultdb;user=SEU_USUARIO;password=SUA_SENHA;SslMode=Required;"
dotnet ef database update   # só aplica o que ainda não foi aplicado
```

Atenção ao usar o banco compartilhado:
- O plano Free **desliga sozinho quando fica inativo**: se a API não conectar, ligue o serviço no console do Aiven (Overview → Power on) e espere ficar *Running*.
- Rode `dotnet ef database update` depois de cada `git pull` que traga migration nova, e **combine no grupo antes de gerar migration nova**, pra duas pessoas não criarem migrations conflitantes no mesmo banco.
- Não apague dados dos outros: é um banco só, com 1 GB.
- Se preferir um banco isolado, o fluxo local abaixo continua valendo (guarde a string local em outra chave, ex.: `ConnectionStrings:MySqlLocal`, e troque a `MySql` quando quiser).

**Banco local (alternativa):**
1. Tenha um MySQL local em execução;
2. Configure a connection string via `dotnet user-secrets` (veja [Back-end](#back-end-c--net)), nunca em `appsettings.json`;
3. Rode `dotnet ef database update` em `backend/StockSweet.Api`.

A migration `AddPrecificacao` cria a tabela `Precificacao` (snapshots; excluir a receita apaga o histórico junto, e o usuário que calculou não pode ser excluído enquanto houver snapshot), a tabela `ConfiguracaoPrecificacao` (já com a linha única da margem padrão em 30%) e a coluna `Receita.MargemLucro` (nula por padrão). Quem já tem o banco criado só precisa rodar `dotnet ef database update` de novo.

Hoje as migrations cobrem `Usuario` (com o campo `Nivel`: Usuário/Gestor), `Insumo`, `MovimentacaoEstoque`, `Receita` (nome único) e `ItemReceita` (único por receita + insumo), `Precificacao` (histórico de preços) e `ConfiguracaoPrecificacao` (margem padrão). A entidade Fornecedor do [Modelo de dados](#-modelo-de-dados) entra nas próximas sprints.

---

## 📁 Estrutura de pastas

```
stocksweet/
├── backend/StockSweet.Api/   # API em C# (.NET)
│   ├── Controllers/          # AuthController, InsumosController, MovimentacoesController, ReceitasController, ItensReceitaController, CustosController, PrecificacaoController
│   ├── DTOs/                 # AuthDto, EstoqueDto, ReceitaDto, CustoDto, PrecificacaoDto
│   ├── banco/                # StockDbContext (EF Core)
│   ├── entidades/            # Usuario, Insumo, MovimentacaoEstoque, Receita, ItemReceita, Precificacao, ConfiguracaoPrecificacao (e enums)
│   ├── services/             # JwtService, EmailValidacao, EstoqueService, CustoService, PrecificacaoService
│   └── Migrations/
├── frontend/                 # Aplicação estática (HTML, CSS e JavaScript)
│   ├── css/                  # style.css (login e formulários) e dashboard.css (painel)
│   ├── js/                   # config.js, login.js, session.js, estoqueService.js (mock), receitaService.js, precificacaoService.js,
│   │                         # dashboard.js e dashboard/ (módulos do painel)
│   ├── assets/
│   ├── index.html            # login
│   ├── dashboard.html        # painel pós-login
│   ├── entrada_mercadorias.html
│   ├── saida_mercadorias.html
│   ├── cadastro_receitas.html
│   └── precificacao.html
└── docs/                     # Declaração de Visão, diagramas, relatório técnico
```

---

## 🎓 Contexto acadêmico

Trabalho de Conclusão de Curso apresentado ao Curso Técnico em Desenvolvimento de Sistemas — modalidade EaD (SEAD/CGTEC), como requisito parcial para obtenção do título de Técnico em Desenvolvimento de Sistemas.

**Desenvolvimento:** 1º e 2º semestre de 2026
**Conclusão prevista:** novembro de 2026

