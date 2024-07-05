const express = require('express');
const session = require('express-session');
const app = express();
const http = require('http');
const server = http.createServer(app);
const sqlite = require('sqlite3').verbose();
const path = require('path');
const upload = require('./upload');
const bcrypt = require('bcrypt');
const fs = require('fs');
let produits = "./produits.js";
console.log(produits)

const publicDir = path.join(__dirname, "./public");

class Product {
    constructor(nom, lien, imglink){
        this.nom = nom;
        this.lien = lien;
        this.imglink = imglink;
    }
}


app.use(
    session({
        secret: "secret",
        resave: true,
        saveUninitialized: true,
    })
);
app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: "true" }));
app.use(express.json());

let db = new sqlite.Database('./db/admin.db', (err) => {
    if(err) {
        console.error(err);
    }
    console.log("Connected to admin db");
});


db.exec("CREATE TABLE IF NOT EXISTS user (pwd TEXT)");


app.use(express.static(__dirname + '/public'));

app.get("/", (req, res) => {
    fs.readFile("./produits.json", (err, file) => {
        file = JSON.parse(file);
        console.log(file['produits']);
        return res.render("index.hbs", {
            product: file["produits"]
        })
    })
    
});

app.get("/admin", (req, res) => {
    if(!req.session.loggin) {
        return res.render("/login", {}, 302);
    }
    return res.render("admin.hbs");
})

app.get("/createproduct", (req, res) => {
    if(!req.session.loggin) {
        return res.redirect("/login", {}, 302);
    }
    fs.readdir("./public/img", (err, files) => {
        res.render("createproduct.hbs", {
            size: files.length-2
        });    
    });
})


app.get("/produits", (req, res) => {
    if(!req.session.loggin) {
        return res.redirect("/login",{}, 302);
    }
    
    fs.readFile("./produits.json", (err, file) => {
        if(file.length != 0) {
            file = JSON.parse(file);
            console.log(file['produits']);
            fs.readdir("./public/img", (err,files) => {
                res.render("produits.hbs", {
                    product: file["produits"],
                    size: files.length-2
                })
            })
        }
    })
    
});

app.get("/delete", (req, res) => {
    if(!req.session.loggin) {
        return res.redirect("/login", {
            
        },302);
    }
    
    fs.readFile("./produits.json", (err, file) => {
        if(file.length != 0) {
            file = JSON.parse(file);
            console.log(file['produits']);
            return res.render("delete.hbs", {
                product: file["produits"],
            })
        }
    })
});



app.get("/login", (req, res) => {
    fs.readFile('./configured.json', (err, file) => {
        console.log(JSON.parse(file));
    });
    res.render("login.hbs");
});

app.get("/register", (req, res) => {
    fs.readFile('./configured.json', (err, file) => {
        file = JSON.parse(file);
        if(file.configured == false) {
            return res.render("register.hbs");
        }
        return res.render("login.hbs");
    });
});



app.post("/register", async (req, res) => {
    let password = req.body.password;
    let hashedPassword = await bcrypt.hash(password, 8);

    db.run("INSERT OR IGNORE INTO user(pwd) VALUES(?)" , [hashedPassword], (err) => {
        if(err) throw err;
        fs.readFile("./configured.json", (err, file) => {
            file = JSON.parse(file);
            file.configured = true;
            fs.writeFileSync("./configured.json", JSON.stringify(file));
        });
        return res.redirect("login.hbs");
    });
   
});

app.post("/edit", (req, res) => {
    let select = req.body.name;
    let newlink = req.body.lien;
    let imglink = req.body.imglink;
    console.log(imglink);
    if(newlink.length < 1) {
        newlink = "undefined";
    }
    if(imglink.length < 1) {
        imglink = "undefined";
    }

    fs.readFile("./produits.json", (err, file) => {
        file = JSON.parse(file);

        for(let i = 0; i < file['produits'].length; i++) {
            console.log(file['produits'][i].nom)
            if(file['produits'][i].nom == select) {
                file['produits'][i].lien = newlink;
                file['produits'][i].imglink = imglink;
                console.log(file['produits']);
                fs.writeFileSync("./produits.json", JSON.stringify(file));
                return res.redirect("/produits", {
                    message: "Article modifé"
                },302);
            }
        }
    })
});

app.post('/delete', (req, res) => {
    let select = req.body.select;
    console.log(select)

    fs.readFile("./produits.json", (err, file) => {
        file = JSON.parse(file);

        for(let i = 0; i < file['produits'].length; i++) {
            console.log(file['produits'][i].nom)
            if(file['produits'][i].nom == select) {
                file['produits'].splice(i, 1);
                console.log(file['produits']);
                fs.writeFileSync("./produits.json", JSON.stringify(file));
                return res.redirect("/delete", {
                    message: "Produit supprimé"
                }, 302);
            }
        }
    })
});

app.post("/addproduct", (req, res) => {
    const produit = new Product(req.body.name, req.body.link, req.body.imglink);
    fs.readFile('./produits.json', (err, data) => {
        if (err) throw err;
        if(data.length == 0) {
            console.log("No products");
            let product = {
                "produits": [{nom: req.body.name, lien: req.body.link, imglink : req.body.imglink}]
            }
            console.log(product);
            fs.writeFileSync("./produits.json", JSON.stringify(product));
            return res.redirect("/createproduct", {
                message: "Produit ajouté"
            },302);
        
        }
        let exist = false;
        let productList = JSON.parse(data);
        productList['produits'].forEach(element => {
            console.log(element.nom);
            if(element.nom == produit.nom) {
                exist = true;
            } 
        });
        if(exist == false) {
            productList["produits"].push(produit);
            fs.writeFileSync("./produits.json", JSON.stringify(productList));
            res.redirect("/createproduct", {
                message: "Produit ajouté"
            }, 302);
        } else {
            return res.redirect("/createproduct", {
                message: "Ce produit existe déja"
            },302) 
            
        }


    })
    
});

app.post("/login", async (req, res) => {
    let password = req.body.password;

    const resultpass = await db.get('SELECT pwd FROM user', async (err, pwd) => {
        console.log(pwd.pwd);
        await bcrypt.compare(password, pwd.pwd, (error, result) => {
            if(result == true) {
                req.session.loggin = true;
                return res.redirect("/admin");
            }
            return res.redirect("login.hbs");
        });

    })

})

app.post('/upload', upload.single('file'), (req, res) => {
    // Handle the uploaded file
    res.json({ message: 'Fichier envoyé' });
  });

server.listen(5100, () => {
    console.log("Web serveur connected on port 5100");
});