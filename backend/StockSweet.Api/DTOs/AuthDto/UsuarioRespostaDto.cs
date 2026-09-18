using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using StockSweet.Api.entidades;

namespace StockSweet.Api.DTOs.AuthDto
{
    public class UsuarioRespostaDto
    {
        public int Id { get; set; }

        public required string Nome { get; set; }

        public required string Email { get; set; }

        public NivelUsuario Nivel { get; set; }

    }
}