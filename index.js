import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';

const app = express();
const port = 3000;
const db = new pg.Client({
    user: 'postgres',
    database: 'wisperdb',
    password: '12@Arpush',
    port: 5433,
    host: 'localhost'
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
db.connect();

app.get("/", (req, res) => {
    res.render("homepage.ejs");
});

app.post("/register", (req, res) => {
    res.render("signinpage.ejs", { message: "" })
})

app.post("/registeremail", async (req, res) => {
    const email = req.body.email;
    const pwd = req.body.pwd;
    try {
        const data = await db.query("INSERT INTO wisperlogin(email, passwords) VALUES($1, $2) RETURNING *", [email, pwd]);
        res.redirect("/");
    }
    catch (error) {
        console.log("Could not add email and password");
        const message = 'Could not add email and password';
        res.render("signinpage.ejs", { message });
    }
})

app.post("/login", (req, res) => {
    res.render("loginpage.ejs", {message: ""});
});

app.post("/logintoemail", async (req, res) => {
    const email = req.body.email;
    const pwd = req.body.pwd;
    try {
        const data = await db.query("SELECT * FROM wisperlogin WHERE email = $1 AND passwords = $2", [email, pwd]);
        const message = 'You are logged in';
        res.render("loginpage.ejs", { message });
    }
    catch (error) {
        console.log("Email and password did not match.");
        const message = 'Email and password did not match.';
        res.render("loginpage.ejs", { message });
    }
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});