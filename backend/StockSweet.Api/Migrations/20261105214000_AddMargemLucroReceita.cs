using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockSweet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMargemLucroReceita : Migration
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
                nullable: false,
                defaultValue: 50.00m);

            migrationBuilder.AddColumn<decimal>(
                name: "MargemLucroMinima",
                table: "Receita",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 20.00m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MargemLucro",
                table: "Receita");

            migrationBuilder.DropColumn(
                name: "MargemLucroMinima",
                table: "Receita");
        }
    }
}

