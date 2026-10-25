using System.Text.Json.Serialization;

namespace StockSweet.Api.entidades
{
    public enum TipoMovimentacao
    {
        [JsonStringEnumMemberName("ENTRADA")]
        Entrada,

        [JsonStringEnumMemberName("SAIDA")]
        Saida
    }
}
