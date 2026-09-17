using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mail;
using System.Threading.Tasks;

namespace StockSweet.Api.services
{
    public class EmailValidacao
    {
        public bool ValidarEmail(string email)
        {
            if(email == null)
            {
                return false;
            }
            
            try
            {
                MailAddress endereco = new MailAddress(email);

                return endereco.Address == email;
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}