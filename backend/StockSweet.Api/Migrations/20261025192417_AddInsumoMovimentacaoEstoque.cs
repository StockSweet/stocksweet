using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockSweet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInsumoMovimentacaoEstoque : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Insumo",
                columns: table => new
                {
                    IdInsumo = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Nome = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UnidadeMedida = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    QuantidadeEstoque = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false),
                    PrecoCompra = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    EstoqueMinimo = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Insumo", x => x.IdInsumo);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "MovimentacaoEstoque",
                columns: table => new
                {
                    IdMovimentacao = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    IdInsumo = table.Column<int>(type: "int", nullable: false),
                    IdUsuario = table.Column<int>(type: "int", nullable: false),
                    Tipo = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Motivo = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Quantidade = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false),
                    ValorUnitario = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    Data = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Observacao = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovimentacaoEstoque", x => x.IdMovimentacao);
                    table.ForeignKey(
                        name: "FK_MovimentacaoEstoque_Insumo_IdInsumo",
                        column: x => x.IdInsumo,
                        principalTable: "Insumo",
                        principalColumn: "IdInsumo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MovimentacaoEstoque_Usuario_IdUsuario",
                        column: x => x.IdUsuario,
                        principalTable: "Usuario",
                        principalColumn: "IdUsuario",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_MovimentacaoEstoque_IdInsumo_Data",
                table: "MovimentacaoEstoque",
                columns: new[] { "IdInsumo", "Data" });

            migrationBuilder.CreateIndex(
                name: "IX_MovimentacaoEstoque_IdUsuario",
                table: "MovimentacaoEstoque",
                column: "IdUsuario");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MovimentacaoEstoque");

            migrationBuilder.DropTable(
                name: "Insumo");
        }
    }
}
