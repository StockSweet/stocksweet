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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Usuario>()
                .Property(u => u.Nivel)
                .HasConversion<string>()
                .HasMaxLength(20);
        }
    }
}