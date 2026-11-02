using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockSweet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddItemReceita : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ItemReceita",
                columns: table => new
                {
                    IdItem = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    IdReceita = table.Column<int>(type: "int", nullable: false),
                    IdInsumo = table.Column<int>(type: "int", nullable: false),
                    Quantidade = table.Column<decimal>(type: "decimal(12,3)", precision: 12, scale: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemReceita", x => x.IdItem);
                    table.ForeignKey(
                        name: "FK_ItemReceita_Insumo_IdInsumo",
                        column: x => x.IdInsumo,
                        principalTable: "Insumo",
                        principalColumn: "IdInsumo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItemReceita_Receita_IdReceita",
                        column: x => x.IdReceita,
                        principalTable: "Receita",
                        principalColumn: "IdReceita",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ItemReceita_IdInsumo",
                table: "ItemReceita",
                column: "IdInsumo");

            migrationBuilder.CreateIndex(
                name: "IX_ItemReceita_IdReceita_IdInsumo",
                table: "ItemReceita",
                columns: new[] { "IdReceita", "IdInsumo" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItemReceita");
        }
    }
}
