using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Leybedik.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentFolder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Folder",
                table: "Documents",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "general");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Folder",
                table: "Documents");
        }
    }
}
