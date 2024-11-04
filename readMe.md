# 📦 Sistema de Controle de Estoque

Bem-vindo ao **Sistema de Controle de Estoque**! Este projeto foi desenvolvido para facilitar a gestão de estoque de produtos em comércios locais, com funcionalidades para entradas e saídas de produtos, relatórios e alertas de produtos em falta.

## 🚀 Funcionalidades

- 📋 **Cadastro de Produtos**: Adicione novos produtos ao estoque com informações detalhadas como nome, quantidade, preço e código NCMSH.
- ✏️ **Edição de Produtos**: Atualize os dados dos produtos diretamente pelo sistema.
- ❌ **Exclusão de Produtos**: Remova produtos do estoque de maneira fácil e rápida.
- ➕ **Registro de Entradas**: Adicione novas unidades ao estoque e mantenha um registro preciso de cada entrada.
- ➖ **Registro de Saídas**: Controle as saídas de produtos e atualize automaticamente o estoque.
- 📉 **Relatórios**: Gere relatórios detalhados de entradas e saídas por período e identifique produtos fora de estoque.
- ⚠️ **Alerta de Estoque Baixo**: Notificação visual quando um produto estiver fora de estoque (quantidade igual a zero).

## 🛠️ Tecnologias Utilizadas

- **Back-end**: 
  - 🟢 [Node.js](https://nodejs.org/) - Ambiente de execução para o JavaScript.
  - 🔐 [Passport.js](http://www.passportjs.org/) - Autenticação de usuários com CNPJ e senha.
  - 🗃️ [PostgreSQL](https://www.postgresql.org/) - Banco de dados relacional utilizado para armazenar os produtos e registros.
  - 📄 [EJS](https://ejs.co/) - Motor de template para renderização dinâmica das páginas.
  
- **Front-end**:
  - 🎨 [CSS3](https://www.w3.org/Style/CSS/) - Estilização das páginas, aplicando conceitos de UX/UI.
  - 📑 [HTML5](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5) - Estruturação das páginas.
  - 🚀 JavaScript - Lógica para interação com o usuário e atualizações dinâmicas no front-end.

## 📂 Estrutura do Projeto

```bash
├── public/             # Arquivos estáticos (CSS, imagens, etc.)
├── views/              # Templates EJS
│   ├── partials/       # Cabeçalhos e rodapés reutilizáveis
│   └── layout.ejs      # Layout base para todas as páginas
├── routes/             # Rotas da aplicação
├── models/             # Modelos para interagir com o banco de dados
└── app.js              # Arquivo principal da aplicação
```

## 📝 Licença 

- Feito com ❤️ por Davi Pereira - Front-End Developer. Todos os direitos reservados.