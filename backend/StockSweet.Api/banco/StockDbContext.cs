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
        public DbSet<Fornecedor> Fornecedor { get; set; }
        public DbSet<MovimentacaoEstoque> MovimentacaoEstoque { get; set; }
        public DbSet<Receita> Receita { get; set; }
        public DbSet<ItemReceita> ItemReceita { get; set; }
        public DbSet<Precificacao> Precificacao { get; set; }
        public DbSet<ConfiguracaoPrecificacao> ConfiguracaoPrecificacao { get; set; }

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

            modelBuilder.Entity<Fornecedor>()
                .HasIndex(f => f.Nome)
                .IsUnique();

            // Excluir o fornecedor não apaga o insumo: ele só fica sem fornecedor.
            modelBuilder.Entity<Insumo>()
                .HasOne(i => i.Fornecedor)
                .WithMany()
                .HasForeignKey(i => i.IdFornecedor)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Receita>()
                .HasIndex(r => r.Nome)
                .IsUnique();

            modelBuilder.Entity<ItemReceita>(item =>
            {
                // Excluir a receita leva a ficha técnica junto.
                item.HasOne(i => i.Receita)
                    .WithMany(r => r.Itens)
                    .HasForeignKey(i => i.IdReceita)
                    .OnDelete(DeleteBehavior.Cascade);

                // Insumo usado em receita não pode ser excluído.
                item.HasOne(i => i.Insumo)
                    .WithMany()
                    .HasForeignKey(i => i.IdInsumo)
                    .OnDelete(DeleteBehavior.Restrict);

                // O mesmo insumo não entra duas vezes na mesma receita.
                item.HasIndex(i => new { i.IdReceita, i.IdInsumo })
                    .IsUnique();
            });

            modelBuilder.Entity<Precificacao>(preco =>
            {
                // Excluir a receita leva o histórico de preços junto.
                preco.HasOne(p => p.Receita)
                    .WithMany()
                    .HasForeignKey(p => p.IdReceita)
                    .OnDelete(DeleteBehavior.Cascade);

                // Quem calculou não pode sumir enquanto o snapshot existir.
                preco.HasOne(p => p.Usuario)
                    .WithMany()
                    .HasForeignKey(p => p.IdUsuario)
                    .OnDelete(DeleteBehavior.Restrict);

                preco.HasIndex(p => new { p.IdReceita, p.DataCalculo });
            });

            // Uma linha só, criada com a margem padrão inicial.
            modelBuilder.Entity<ConfiguracaoPrecificacao>()
                .HasData(new ConfiguracaoPrecificacao
                {
                    IdConfiguracao = entidades.ConfiguracaoPrecificacao.IdUnico,
                    MargemPadrao = entidades.ConfiguracaoPrecificacao.MargemPadraoInicial,
                });
        }
    }
}