import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import bcrypt from 'bcrypt';

const app = express();
const port = 3000;
const db = new pg.Client({
    user: 'postgres',
    database: 'wisperdb',
    password: '12@Arpush',
    port: 5433,
    host: 'localhost'
});
const saltRound = 10;

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
        bcrypt.hash(pwd, saltRound, async (err, hash) => {
            if (err) {
                const message = 'Could not add email and password';
                res.render("secretpage.ejs", { message });
            } else {
                const newdata = await db.query("INSERT INTO wisperlogin(email, passwords) VALUES($1, $2) RETURNING *", [email, hash]);
                res.render("signinpage.ejs", { message: "You are registered, you can now log in." });
            }
        })
    }
    catch (error) {
        console.log("Could not add email and password");
        const message = 'Could not add email and password';
        res.render("signinpage.ejs", { message });
    }
})

app.post("/login", (req, res) => {
    res.render("loginpage.ejs", { message: "" });
});

app.post("/logintoemail", async (req, res) => {
    const email = req.body.email;
    const pwd = req.body.pwd;
    try {
        const logininfo = await db.query("SELECT * FROM wisperlogin WHERE email = $1", [email]);
        const password = logininfo.rows[0].passwords;
        const id = logininfo.rows[0].id;
        console.log(id);
        bcrypt.compare(pwd, password, async (err, result) => {
            if(result == true){
                const message = 'You are logged in';
                const curdata = await db.query("SELECT * FROM secretdata WHERE login_id = $1", [id]);
                const data = curdata.rows;
                res.render("secretpage.ejs", { data, id });
            }
            else{
                console.log("Email and password did not match.");
                const message = 'Email and password did not match.';
                res.render("loginpage.ejs", { message });
            } 
        })
    }
    catch (error) {
        console.log("Email and password did not match.");
        const message = 'Email and password did not match.';
        res.render("loginpage.ejs", { message });
    }
})

app.post("/inputsecret", async (req, res) => {
    const id = req.body.id;
    const secret = req.body.secret;
    try{
    const indata = await db.query("INSERT INTO secretdata(secret, login_id) VALUES ($1, $2) RETURNING *", [secret, id]);
    res.send("Log in again");
    }catch(error){
        console.log("Secret is not inserted");
        res.send("Secret is not inserted");
    }
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});