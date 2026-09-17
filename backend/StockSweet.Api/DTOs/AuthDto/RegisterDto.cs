using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace StockSweet.Api.DTOs.AuthDto
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "O nome é obrigatório.")]
        public required string Nome { get; set; }
    
        [Required(ErrorMessage = "O Email é obrigatório.")]
        [EmailAddress(ErrorMessage = "Email inválido.")]
        public required string Email { get; set; }

        [Required(ErrorMessage = "A senha é obrigatória.")]
        [MinLength(8, ErrorMessage = "A senha deve ter no mínimo 8 caracteres.")]
        public required string Senha { get; set; }
    }
}