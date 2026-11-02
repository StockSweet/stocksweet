using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockSweet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPrecificacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MargemLucro",
                table: "Receita",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ConfiguracaoPrecificacao",
                columns: table => new
                {
                    IdConfiguracao = table.Column<int>(type: "int", nullable: false),
                    MargemPadrao = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfiguracaoPrecificacao", x => x.IdConfiguracao);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Precificacao",
                columns: table => new
                {
                    IdPrecificacao = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    IdReceita = table.Column<int>(type: "int", nullable: false),
                    MargemLucro = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    CustoProducao = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    CustoPorUnidade = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    PrecoSugerido = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    PrecoSugeridoTotal = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    IdUsuario = table.Column<int>(type: "int", nullable: false),
                    DataCalculo = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Precificacao", x => x.IdPrecificacao);
                    table.ForeignKey(
                        name: "FK_Precificacao_Receita_IdReceita",
                        column: x => x.IdReceita,
                        principalTable: "Receita",
                        principalColumn: "IdReceita",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Precificacao_Usuario_IdUsuario",
                        column: x => x.IdUsuario,
                        principalTable: "Usuario",
                        principalColumn: "IdUsuario",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "ConfiguracaoPrecificacao",
                columns: new[] { "IdConfiguracao", "MargemPadrao" },
                values: new object[] { 1, 30m });

            migrationBuilder.CreateIndex(
                name: "IX_Precificacao_IdReceita_DataCalculo",
                table: "Precificacao",
                columns: new[] { "IdReceita", "DataCalculo" });

            migrationBuilder.CreateIndex(
                name: "IX_Precificacao_IdUsuario",
                table: "Precificacao",
                column: "IdUsuario");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConfiguracaoPrecificacao");

            migrationBuilder.DropTable(
                name: "Precificacao");

            migrationBuilder.DropColumn(
                name: "MargemLucro",
                table: "Receita");
        }
    }
}
