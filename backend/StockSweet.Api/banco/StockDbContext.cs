using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using StockSweet.Api.entidades;

namespace StockSweet.Api.banco
{
    public class StockDbContext : DbContext
    {

        public StockDbContext(DbContextOptions<StockDbContext> options) : base(options)
        {
        }

        public DbSet<Usuario> Usuario {get;set;}
        public DbSet<Insumo> Insumo { get; set; }
        public DbSet<MovimentacaoEstoque> MovimentacaoEstoque { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Usuario>()
                .Property(u => u.Nivel)
                .HasConversion<string>()
                .HasMaxLength(20);

            modelBuilder.Entity<MovimentacaoEstoque>(mov =>
            {
                mov.Property(m => m.Tipo)
                    .HasConversion<string>()
                    .HasMaxLength(20);

                mov.Property(m => m.Motivo)
                    .HasConversion<string>()
                    .HasMaxLength(20);

                // Histórico não pode sumir junto com o insumo ou o usuário.
                mov.HasOne(m => m.Insumo)
                    .WithMany()
                    .HasForeignKey(m => m.IdInsumo)
                    .OnDelete(DeleteBehavior.Restrict);

                mov.HasOne(m => m.Usuario)
                    .WithMany()
                    .HasForeignKey(m => m.IdUsuario)
                    .OnDelete(DeleteBehavior.Restrict);

                mov.HasIndex(m => new { m.IdInsumo, m.Data });
            });
        }
    }
}