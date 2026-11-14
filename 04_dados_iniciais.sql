-- StockSweet - Script 4: carga de dados iniciais (os mesmos insumos, fornecedores e receitas
-- que o painel mostrava com dados simulados). Pode ser executado mais de uma vez: nada é duplicado.
--
-- Antes de rodar, selecione o banco do projeto (USE stocksweet_db; no MySQL local, ou o defaultdb do Aiven).
-- Pré-requisitos: scripts 01 e 02 (ou as migrations do EF Core) já aplicados.
--
-- O estoque inicial de cada insumo é registrado como uma ENTRADA em MovimentacaoEstoque, em nome do
-- primeiro usuário Gestor cadastrado; se não houver nenhum, o script não gera as entradas.

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- (1) Fornecedores
INSERT IGNORE INTO Fornecedor (Nome, Observacao) VALUES
  ('Moinho Dourado', 'Prazo médio de entrega: 2 dias'),
  ('Laticínios Vale Verde', 'Prazo médio de entrega: 1 dia'),
  ('Cacau & Cia', 'Prazo médio de entrega: 3 dias'),
  ('Doce Atacado', 'Prazo médio de entrega: 2 dias'),
  ('Frutas do Sítio', 'Prazo médio de entrega: 1 dia'),
  ('EmbalaPack', 'Prazo médio de entrega: 4 dias'),
  ('Casa dos Aromas', 'Prazo médio de entrega: 3 dias');

-- (2) Insumos: saldo, preço de compra e estoque mínimo; o fornecedor é ligado pelo nome
INSERT INTO Insumo (Nome, UnidadeMedida, QuantidadeEstoque, PrecoCompra, EstoqueMinimo, IdFornecedor)
SELECT t.Nome, t.UnidadeMedida, t.QuantidadeEstoque, t.PrecoCompra, t.EstoqueMinimo, t.IdFornecedor
FROM (
  SELECT 'Farinha de trigo' AS Nome, 'kg' AS UnidadeMedida, 102.5 AS QuantidadeEstoque, 4.8 AS PrecoCompra, 66 AS EstoqueMinimo, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Moinho Dourado') AS IdFornecedor
  UNION ALL SELECT 'Amido de milho', 'kg', 23, 7.9, 16.5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Moinho Dourado')
  UNION ALL SELECT 'Aveia em flocos', 'kg', 15, 11.5, 13, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Moinho Dourado')
  UNION ALL SELECT 'Farinha de amêndoas', 'kg', 5.5, 68, 6.5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Moinho Dourado')
  UNION ALL SELECT 'Leite integral', 'L', 59.5, 5.2, 49.5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Laticínios Vale Verde')
  UNION ALL SELECT 'Creme de leite fresco', 'L', 8.5, 24.9, 20, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Laticínios Vale Verde')
  UNION ALL SELECT 'Manteiga sem sal', 'kg', 18, 48, 16.5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Laticínios Vale Verde')
  UNION ALL SELECT 'Ovos', 'dz', 30, 11, 33, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Laticínios Vale Verde')
  UNION ALL SELECT 'Leite condensado', 'un', 96, 6.4, 66, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Laticínios Vale Verde')
  UNION ALL SELECT 'Cream cheese', 'kg', 8.5, 39, 6.5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Laticínios Vale Verde')
  UNION ALL SELECT 'Chocolate meio amargo', 'kg', 36.5, 54, 25, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Cacau & Cia')
  UNION ALL SELECT 'Chocolate branco', 'kg', 11.5, 58, 13, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Cacau & Cia')
  UNION ALL SELECT 'Cacau em pó 50%', 'kg', 10.5, 42, 8.5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Cacau & Cia')
  UNION ALL SELECT 'Granulado de chocolate', 'kg', 15, 21, 10, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Cacau & Cia')
  UNION ALL SELECT 'Açúcar refinado', 'kg', 132, 4.6, 82.5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Doce Atacado')
  UNION ALL SELECT 'Açúcar de confeiteiro', 'kg', 8.5, 7.2, 20, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Doce Atacado')
  UNION ALL SELECT 'Mel', 'kg', 6.5, 32, 5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Doce Atacado')
  UNION ALL SELECT 'Morango congelado', 'kg', 21.5, 22, 20, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Frutas do Sítio')
  UNION ALL SELECT 'Polpa de maracujá', 'kg', 13, 26, 10, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Frutas do Sítio')
  UNION ALL SELECT 'Doce de leite', 'kg', 25, 17.5, 16.5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Doce Atacado')
  UNION ALL SELECT 'Geleia de damasco', 'kg', 6.5, 29, 5, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Doce Atacado')
  UNION ALL SELECT 'Caixa para brigadeiros', 'un', 281, 3.4, 248, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'EmbalaPack')
  UNION ALL SELECT 'Forminhas nº 4 (100 un)', 'pct', 99, 5.9, 50, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'EmbalaPack')
  UNION ALL SELECT 'Fita de cetim', 'rolo', 18, 9.5, 10, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'EmbalaPack')
  UNION ALL SELECT 'Essência de baunilha', 'un', 15, 18, 8, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Casa dos Aromas')
  UNION ALL SELECT 'Corante alimentício em gel', 'un', 5, 12.5, 10, (SELECT IdFornecedor FROM Fornecedor WHERE Nome = 'Casa dos Aromas')
) AS t
WHERE NOT EXISTS (SELECT 1 FROM Insumo i WHERE i.Nome = t.Nome);

-- (3) Estoque inicial como movimentação de ENTRADA (só para insumos que ainda não têm movimentações)
INSERT INTO MovimentacaoEstoque (IdInsumo, IdUsuario, Tipo, Motivo, Quantidade, ValorUnitario, Data, Observacao)
SELECT i.IdInsumo, u.IdUsuario, 'Entrada', NULL, i.QuantidadeEstoque, i.PrecoCompra, CURRENT_TIMESTAMP(6),
       'Estoque inicial (carga de dados)'
FROM Insumo i
JOIN (SELECT IdUsuario FROM Usuario WHERE Nivel = 'Gestor' ORDER BY IdUsuario LIMIT 1) u
WHERE i.QuantidadeEstoque > 0
  AND NOT EXISTS (SELECT 1 FROM MovimentacaoEstoque m WHERE m.IdInsumo = i.IdInsumo);

-- (4) Receitas: lote de 20 unidades (10 fatias no cheesecake). MargemLucro = preço de venda sobre o custo.
INSERT IGNORE INTO Receita (Nome, RendimentoReceita, UnidadeRendimento, MargemLucro) VALUES
  ('Brigadeiro gourmet', 20, 'unidades', 447.55),
  ('Brownie de chocolate', 20, 'unidades', 101.57),
  ('Cookie de chocolate', 20, 'unidades', 105.66),
  ('Cupcake de baunilha', 20, 'unidades', 208.52),
  ('Cheesecake de morango', 10, 'fatias', 120.25),
  ('Macaron de doce de leite', 20, 'unidades', 309.23),
  ('Trufa de maracujá', 20, 'unidades', 173.72),
  ('Bolo de pote de morango', 20, 'unidades', 122.64);

-- (5) Fichas técnicas: quantidade na unidade de medida de cada insumo
INSERT IGNORE INTO ItemReceita (IdReceita, IdInsumo, Quantidade)
SELECT r.IdReceita, i.IdInsumo, v.Quantidade
FROM (
  SELECT 'Brigadeiro gourmet' AS Receita, 'Leite condensado' AS Insumo, 0.7 AS Quantidade
  UNION ALL SELECT 'Brigadeiro gourmet', 'Cacau em pó 50%', 0.08
  UNION ALL SELECT 'Brigadeiro gourmet', 'Manteiga sem sal', 0.04
  UNION ALL SELECT 'Brigadeiro gourmet', 'Granulado de chocolate', 0.14
  UNION ALL SELECT 'Brigadeiro gourmet', 'Forminhas nº 4 (100 un)', 0.2
  UNION ALL SELECT 'Brownie de chocolate', 'Chocolate meio amargo', 0.6
  UNION ALL SELECT 'Brownie de chocolate', 'Manteiga sem sal', 0.56
  UNION ALL SELECT 'Brownie de chocolate', 'Açúcar refinado', 0.7
  UNION ALL SELECT 'Brownie de chocolate', 'Farinha de trigo', 0.4
  UNION ALL SELECT 'Brownie de chocolate', 'Ovos', 1.2
  UNION ALL SELECT 'Brownie de chocolate', 'Cacau em pó 50%', 0.16
  UNION ALL SELECT 'Cookie de chocolate', 'Farinha de trigo', 0.7
  UNION ALL SELECT 'Cookie de chocolate', 'Manteiga sem sal', 0.5
  UNION ALL SELECT 'Cookie de chocolate', 'Açúcar refinado', 0.4
  UNION ALL SELECT 'Cookie de chocolate', 'Chocolate meio amargo', 0.6
  UNION ALL SELECT 'Cookie de chocolate', 'Ovos', 0.5
  UNION ALL SELECT 'Cupcake de baunilha', 'Farinha de trigo', 0.6
  UNION ALL SELECT 'Cupcake de baunilha', 'Açúcar refinado', 0.6
  UNION ALL SELECT 'Cupcake de baunilha', 'Manteiga sem sal', 0.4
  UNION ALL SELECT 'Cupcake de baunilha', 'Ovos', 0.8
  UNION ALL SELECT 'Cupcake de baunilha', 'Essência de baunilha', 0.08
  UNION ALL SELECT 'Cupcake de baunilha', 'Forminhas nº 4 (100 un)', 0.2
  UNION ALL SELECT 'Cupcake de baunilha', 'Cream cheese', 0.4
  UNION ALL SELECT 'Cheesecake de morango', 'Cream cheese', 0.9
  UNION ALL SELECT 'Cheesecake de morango', 'Creme de leite fresco', 0.4
  UNION ALL SELECT 'Cheesecake de morango', 'Açúcar refinado', 0.2
  UNION ALL SELECT 'Cheesecake de morango', 'Morango congelado', 0.6
  UNION ALL SELECT 'Cheesecake de morango', 'Aveia em flocos', 0.15
  UNION ALL SELECT 'Cheesecake de morango', 'Manteiga sem sal', 0.15
  UNION ALL SELECT 'Macaron de doce de leite', 'Farinha de amêndoas', 0.24
  UNION ALL SELECT 'Macaron de doce de leite', 'Açúcar de confeiteiro', 0.3
  UNION ALL SELECT 'Macaron de doce de leite', 'Ovos', 0.4
  UNION ALL SELECT 'Macaron de doce de leite', 'Corante alimentício em gel', 0.04
  UNION ALL SELECT 'Macaron de doce de leite', 'Doce de leite', 0.2
  UNION ALL SELECT 'Trufa de maracujá', 'Chocolate branco', 0.36
  UNION ALL SELECT 'Trufa de maracujá', 'Creme de leite fresco', 0.2
  UNION ALL SELECT 'Trufa de maracujá', 'Polpa de maracujá', 0.16
  UNION ALL SELECT 'Trufa de maracujá', 'Granulado de chocolate', 0.08
  UNION ALL SELECT 'Trufa de maracujá', 'Forminhas nº 4 (100 un)', 0.2
  UNION ALL SELECT 'Bolo de pote de morango', 'Farinha de trigo', 0.8
  UNION ALL SELECT 'Bolo de pote de morango', 'Ovos', 1.2
  UNION ALL SELECT 'Bolo de pote de morango', 'Açúcar refinado', 0.6
  UNION ALL SELECT 'Bolo de pote de morango', 'Leite integral', 1
  UNION ALL SELECT 'Bolo de pote de morango', 'Morango congelado', 1
  UNION ALL SELECT 'Bolo de pote de morango', 'Cream cheese', 0.6
  UNION ALL SELECT 'Bolo de pote de morango', 'Creme de leite fresco', 0.6
) AS v
JOIN Receita r ON r.Nome = v.Receita
JOIN Insumo  i ON i.Nome = v.Insumo;
