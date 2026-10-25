using System.Text.Json.Serialization;

namespace StockSweet.Api.entidades
{
    // Os nomes em JSON batem com os valores do select de motivo da tela de saída.
    public enum MotivoSaida
    {
        [JsonStringEnumMemberName("PRODUCAO")]
        Producao,

        [JsonStringEnumMemberName("PERDA_VALIDADE")]
        PerdaValidade,

        [JsonStringEnumMemberName("AVARIA")]
        Avaria,

        [JsonStringEnumMemberName("OUTRO")]
        Outro
    }
}
