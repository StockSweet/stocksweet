namespace StockSweet.Api.DTOs.ReceitaDto
{
    // Resposta de GET api/receitas/{id}: os dados da receita mais a ficha técnica.
    public class ReceitaDetalheRespostaDto : ReceitaRespostaDto
    {
        public List<ItemReceitaRespostaDto> Itens { get; set; } = new();
    }
}
