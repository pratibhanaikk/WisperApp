import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import bcrypt from 'bcrypt';
import session from 'express-session';
import passport from 'passport';
import { Strategy } from 'passport-local';
import GoogleStrategy from 'passport-google-oauth2';
import env from 'dotenv';

const app = express();
const port = 3000;
env.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
    host: process.env.DB_HOST
});
db.connect();

const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use("local", new Strategy({ usernameField: "email", passwordField: "pwd" },
    async function (email, password, done) {
        try {
            const result = await db.query("SELECT * FROM wisperlogin WHERE email = $1", [email]);
            if (result.rows.length === 0) return done(null, false);
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.passwords);
            if (match) return done(null, user);
            else return done(null, false);
        } catch (err) {
            return done(err);
        }
    }
));

passport.use("google", new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIEND_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "",
    userProfileURL: "" 
}, async (accessToken, refreshToken, profile, cb) => {
    console.log(profile);
      try{
         const result = await db.query("SELECT * FROM wisperlogin WHERE email = $1", [profile.email]);
         if(result.rows.length === 0){
            const newUser = await db.query("INSERT INTO wisperlogin(email, passwords) VALUES ($1, $2)", [profile.email, "google"]);
            cb(null, newUser.rows[0]);
         }else{
            cb(null, result.rows[0]);
         }
      }catch(err){
        cb(err);
      }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query("SELECT * FROM wisperlogin WHERE id = $1", [id]);
        if (result.rows.length > 0) done(null, result.rows[0]);
        else done(null, false);
    } catch (err) {
        done(err);
    }
});

app.get("/", (req, res) => {
    res.render("homepage.ejs");
});

app.get("/register", (req, res) => {
    res.render("signinpage.ejs", { message: "" });
});

app.post("/registeremail", async (req, res) => {
    const { email, pwd } = req.body;
    try {
        const hash = await bcrypt.hash(pwd, saltRounds);
        await db.query("INSERT INTO wisperlogin (email, passwords) VALUES ($1, $2)", [email, hash]);
        res.redirect("/login");
    } catch (err) {
        res.render("signinpage.ejs", { message: "Registration failed." });
    }
});

app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
}));

app.get("/auth/google/secrets", passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}));

app.get("/login", (req, res) => {
    res.render("loginpage.ejs", { message: "" });
});

app.post("/logintoemail", passport.authenticate('local', {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}));

app.get("/secrets", async (req, res) => {
    console.log(req.user);
    if (req.isAuthenticated()) {
        const id = req.user.id;
        const curdata = await db.query("SELECT * FROM secretdata WHERE login_id = $1", [id]);
        const data = curdata.rows;
        res.render("secretpage.ejs", { data, id });
    } else {
        res.redirect("/login");
    }
});

app.post("/inputsecret", async (req, res) => {
    const { id, secret } = req.body;
    try {
        await db.query("INSERT INTO secretdata(secret, login_id) VALUES ($1, $2)", [secret, id]);
        res.redirect("/login");
    } catch (err) {
        res.send("Failed to store secret.");
    }
});

app.get("/logout", (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect("/");
    });
});

app.get('/test-session', (req, res) => {
    if (req.session.views) {
        req.session.views++;
        res.send(`Viewed ${req.session.views} times`);
    } else {
        req.session.views = 1;
        res.send('Welcome to the session test');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
