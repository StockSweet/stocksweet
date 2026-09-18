using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockSweet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNivelToUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Nivel",
                table: "Usuario",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Usuario")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Nivel",
                table: "Usuario");
        }
    }
}
