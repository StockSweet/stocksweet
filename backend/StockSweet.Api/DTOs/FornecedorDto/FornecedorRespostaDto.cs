namespace StockSweet.Api.DTOs.FornecedorDto
{
    public class FornecedorRespostaDto
    {
        public int IdFornecedor { get; set; }

        public required string Nome { get; set; }

        public string? Telefone { get; set; }

        public string? Email { get; set; }

        public string? Endereco { get; set; }

        public string? Observacao { get; set; }

        // Quantos insumos estão vinculados a este fornecedor.
        public int QuantidadeInsumos { get; set; }
    }
}
