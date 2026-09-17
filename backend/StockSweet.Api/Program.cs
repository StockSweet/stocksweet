using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;
using StockSweet.Api.banco;
using StockSweet.Api.services;

#region builder
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()
        );
    });

builder.Services.AddEndpointsApiExplorer();

#region SwaggerGen pra campo de autorização
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Digite: seu token"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

#endregion

//conexão com o banco
#region BD conexão

string? strConexao = builder.Configuration.GetConnectionString("MySql");

if(strConexao is null)
{
    throw new Exception("valor nulo");
};

builder.Services.AddDbContext<StockDbContext>(options => options.UseMySql(
    strConexao,
    ServerVersion.AutoDetect(strConexao))); 

#endregion

#region  Builder auth

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme= JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;

}).AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; //mudar em produção
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        RoleClaimType = "perfil",

        ValidIssuer = builder.Configuration["JwtConfig:Issuer"],
        ValidAudience = builder.Configuration["JwtConfig:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JwtConfig:Key"]!)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true
    };
});
builder.Services.AddAuthorization();

#endregion
#region CORS

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "https://localhost:7257"
            )
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

#endregion

builder.Services.AddHealthChecks();

#region scopped
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<EmailValidacao>();
#endregion


var app = builder.Build();

app.MapHealthChecks("/api/health");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();


app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
#endregion

app.Run();
