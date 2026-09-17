using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace StockSweet.Api.DTOs.AuthDto
{
    public class AuthRespostaDto
    {
        public required string Token {get;set;}
        public required UsuarioRespostaDto Usuario { get; set; }
    }
}