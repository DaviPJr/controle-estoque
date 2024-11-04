import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import expressLayouts from "express-ejs-layouts";
import flash from "connect-flash";
import PDFDocument from "pdfkit";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(expressLayouts);
app.use(express.json());
app.set('view engine', 'ejs');
app.set('layout', 'layout');

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    }
  })
  );
  
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    next();
});

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        rejectUnauthorized: false 
    }
});

db.connect();

app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/cadastro", (req, res) => {
    res.render("cadastro", {title: "Cadastre-se", style: '/cadastro.css'})
});

app.get("/login", (req, res) => {
    res.render("login", {title: "Log in", style: '/login.css'})
});

app.get("/home", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("home", {nome: req.user.name, title: 'Home', style: '/home.css'})
    } else {
        res.redirect("/login")
    }
});

app.get("/estoque", async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db.query(
            "SELECT * FROM products WHERE user_id = $1",
            [userId]
        );
        const products = result.rows;
        res.render("estoque", {title: "Estoque", products, style: '/estoque.css'})
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar os produtos.")
    }
});

app.get("/cadastro-produto", (req, res) => {
    res.render("cadastro-produto", {title: "Cadastro de Produto", style: '/cadastro-produto.css'});
});

app.get("/editar-produto/:id", async (req, res) => {
    const productId = parseInt(req.params.id); 
    const userId = req.user.id;

    if (isNaN(productId)) {
        return res.status(400).send("ID de produto inválido");
    }

    try {
        const result = await db.query("SELECT * FROM products WHERE id = $1 AND user_id = $2", [productId, userId]);
        const product = result.rows[0];
        if (!product) {
            return res.status(404).send("Produto não encontrado");
        }
        res.render("editar-produto", {title: "Edição de Produto", product, style: 'editar-produto.css'});
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar produtos para edição");
    }
});


app.get("/saida-peca", (req, res) => {
    
    res.render('saida-peca', {
        title: "Saída de produto", style: '/saida.css'});
});

app.get("/buscar-produto", async (req, res) => {
    const productCode = req.query.code;

    try {
        const productResult = await db.query("SELECT nome FROM products WHERE ncmsh = $1 AND user_id = $2",
            [productCode, req.user.id]
        );
        
        if (productResult.rows.length === 0) {
            return res.json({product: null});
        }

        res.json({product: productResult.rows[0]});

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar produto.")
    }
});

app.get("/relatorios", async (req, res) => {
    res.render("relatorios", {
        title: "Relatórios",
        entries: [],
        exits: [],
        outOfStock: [],
        style: 'relatorios.css'
    });
});

app.post("/cadastro", async (req, res) => {
    const name = req.body.nome;
    const cnpj = req.body.cnpj;
    const password = req.body.senha;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE cnpj = $1", 
            [cnpj]
        );

        if (checkResult.rows.length > 0) {
            res.send("CNPJ encontrado, faça seu login por favor")
        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {
                    console.error("Error hashing password", err);
                } else {
                    console.log("Hashed password", hash);
                    const result = await db.query(
                        "INSERT INTO users (name, cnpj, password) VALUES ($1, $2, $3) RETURNING *",
                        [name, cnpj, hash]
                    );
                    const user = result.rows[0];
                    req.login(user, (err) => {
                        if (err) {
                            console.log("Error logging in", err);
                            res.redirect("/login");
                        } else {
                            res.redirect("/home");
                        } 
                    })
                }
            })
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/home",
      failureRedirect: "/login",
    })
);

app.post("/logout", (req, res) => { 
    req.logout((err) => {
        if (err) {
            console.error(err);
            return res.redirect("/home"); 
        }
        req.session.destroy((err) => {
            if (err) {
                console.error(err);
                return res.redirect("/home"); 
            }
            res.redirect("/login"); 
        });
    });
})

app.post("/cadastro-produto", async (req, res) => {
    const { nome, quantidade, preco, codigo } = req.body;
    const userId = req.user.id;

    try {
        await db.query(
            "INSERT INTO products (nome, quantidade, preco, ncmsh, user_id, data_entrada) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)",
            [nome, quantidade, preco, codigo, userId]
        );
        res.render("cadastro-produto", {message: "Produto cadastrado com sucesso!"});
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao cadastrar o produto.");
    }
});

app.post("/editar-produto/:id", async (req, res) => {
    const productId = req.params.id;
    const {nome, quantidade, preco, ncmsh} = req.body;
    const userId = req.user.id;

    try {
        await db.query(
            "UPDATE products SET nome = $1, quantidade = $2, preco = $3, ncmsh = $4, data_entrada = CURRENT_DATE WHERE id = $5 AND user_id = $6", 
            [nome, quantidade, preco, ncmsh, productId, userId]
        );
        res.redirect("/estoque");
    } catch (err) {
        console.error(err)
        res.status(500).send("Erro ao editar o produto")
    }
});

app.post("/excluir-produto/:id", async (req, res) => {
    const productId = req.params.id;
    const userId = req.user.id;

    try {
        await db.query("DELETE FROM products WHERE id = $1 AND user_id = $2", [productId, userId])
        res.redirect("/estoque");
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao excluir o produto")
    }
});

app.post("/saida-peca", async (req, res) => {
    const userId = req.user.id;
    const { productName, quantity, clientName, saleValue } = req.body;
    const productId = req.body.productCode;

    try {
        const result = await db.query("SELECT quantidade FROM products WHERE ncmsh = $1", [productId]);
        const availableQuantity = result.rows[0]?.quantidade;

        if (quantity > availableQuantity) {
            req.flash('errorMessage', "Quantidade solicitada excede a quantidade disponível no estoque.");
            const message = req.flash('errorMessage')
            console.log("Mensagem de erro definida:", message); 
            return res.render("saida-peca", {
                title: "Saída de produto",
                errorMessage: message.length > 0 ? message[0] : null, 
                successMessage: null 
            });
        }

        await db.query(
            "INSERT INTO saidas (nome_produto, quantidade, nome_cliente, valor, user_id, product_id) VALUES ($1, $2, $3, $4, $5, $6)",
            [productName, quantity, clientName, saleValue, userId, productId]
        );

        await db.query("UPDATE products SET quantidade = quantidade - $1 WHERE ncmsh = $2", [quantity, productId]);

        req.flash('successMessage', "Saída de produto registrada com sucesso!");
        const message = req.flash('successMessage')
        console.log("Mensagem de sucesso definida:", message); 
        return res.render("saida-peca", {
            title: "Saída de produto",
            errorMessage: null, 
            successMessage: message.length > 0 ? message[0] : null 
        });
    } catch (err) {
        console.error(err);
        req.flash('errorMessage', "Erro ao fazer a saída do produto.");
        const message = req.flash('errorMessage')
        console.log("Mensagem de erro definida no catch:", message); 
        return res.render("saida-peca", {
            title: "Saída de produto",
            errorMessage: message.length > 0 ? message[0] : null,
            successMessage: null
        });
    }
});

app.post("/relatorios", async (req, res) => {
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    try {
        const entries = await db.query(
            "SELECT * FROM products WHERE data_entrada BETWEEN $1 AND $2 AND user_id = $3",
            [startDate, endDate, req.user.id]
        );

        const exits = await db.query(
            "SELECT * FROM saidas WHERE data_saida BETWEEN $1 AND $2 AND user_id = $3",
            [startDate, endDate, req.user.id]
        );

        const outOfStock = await db.query(
            "SELECT * FROM products WHERE quantidade = 0 AND user_id = $1",
            [req.user.id]
        );

        res.render("relatorios", {
            title: "Relatórios",
            entries: entries.rows,
            exits: exits.rows,
            outOfStock: outOfStock.rows,
            style: 'relatorios.css'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar relatórios.");
    }
});

app.post("/exportar-relatorios-pdf",  async (req, res) => {
    
    if (req.isAuthenticated()){
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;

        const adjustDateForTimezone = (dateString) => {
            const date = new Date(dateString);
            const timezoneOffset = date.getTimezoneOffset() * 60000; 
            return new Date(date.getTime() + timezoneOffset); 
        };

        const formattedStartDate = adjustDateForTimezone(startDate).toLocaleDateString('pt-BR');
        const formattedEndDate = adjustDateForTimezone(endDate).toLocaleDateString('pt-BR');
        
        try {
            const entries = await db.query(
                "SELECT * FROM products WHERE data_entrada BETWEEN $1 AND $2 AND user_id = $3",
                [startDate, endDate, req.user.id]
            );

            const exits = await db.query(
                "SELECT * FROM saidas WHERE data_saida BETWEEN $1 AND $2 AND user_id = $3",
                [startDate, endDate, req.user.id]
            );

            const doc = new PDFDocument();
            let buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="relatorios.pdf"');
                res.send(pdfData);
            });
         
            doc.fontSize(20).text(`Relatórios de Estoque: ${formattedStartDate} a ${formattedEndDate}`, { align: 'center' });
            doc.moveDown(1.5);  
            
            doc.fontSize(16).text('Entradas', { underline: true });
            doc.moveDown();
            
            doc.fontSize(12);
            entries.rows.forEach(entry => {
                doc.text(`Nome: ${entry.nome}`, { continued: true })
                   .text(` | Quantidade: ${entry.quantidade}`, { continued: true })
                   .text(` | Preço: R$ ${entry.preco}`, { continued: true })
                   .text(` | Código: ${entry.ncmsh}`, { continued: true })
                   .text(` | Data: ${entry.data_entrada.toISOString().split('T')[0]}`);
                doc.moveDown(0.5); 
            });

            doc.moveDown(1); 
           
            doc.fontSize(16).text('Saídas', { underline: true });
            doc.moveDown();

            doc.fontSize(12);
            exits.rows.forEach(exit => {
                doc.text(`Nome: ${exit.nome_produto}`, { continued: true })
                   .text(` | Quantidade: ${exit.quantidade}`, { continued: true })
                   .text(` | Cliente: ${exit.nome_cliente}`, { continued: true })
                   .text(` | Valor: R$ ${exit.valor}`, { continued: true })
                   .text(` | Data: ${exit.data_saida.toISOString().split('T')[0]}`);
                doc.moveDown(0.5); 
            });

            doc.end();

        } catch (err) {
            console.error(err);
            res.status(500).send("Erro ao gerar o PDF.");
        }
    } else {
        res.redirect("/login")
    }
});

passport.use(
    new Strategy({ usernameField: 'cnpj', passwordField: 'password' }, async function verify(cnpj, password, cb) {
        try {
            const result = await db.query("SELECT * FROM users WHERE cnpj = $1", [cnpj]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const storedHashedPassword = user.password;
                bcrypt.compare(password, storedHashedPassword, (err, valid) => {
                    if (err) {
                        return cb(err);
                    }
                    if (valid) {
                        return cb(null, user); 
                    } else {
                        return cb(null, false, { message: "Senha incorreta" }); 
                    }
                });
            } else {
                return cb(null, false, { message: "Usuário não encontrado" }); 
            }
        } catch (err) {
            console.log(err);
            return cb(err);
        }
    })
);

passport.serializeUser((user, cb) => {
    cb(null, user);
});
  
passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});