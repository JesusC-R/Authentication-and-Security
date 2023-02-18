const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const {Schema} = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

mongoose.set("strictQuery", false);
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "3w8t8w3iugv2388324g",
    resave: false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());


main().catch(err => console.log(err));

async function main() {
    const DataBaseName = "SecretsDB";

    await mongoose.connect("mongodb://127.0.0.1:27017/" + DataBaseName, {useNewUrlParser: true});

    const userSchema = new Schema({
        email: String,
        password: String
    });

    userSchema.plugin(passportLocalMongoose);

    const User = mongoose.model("User", userSchema);


    // Required to serialize and deserialize user.
    passport.use(new LocalStrategy(User.authenticate()));

    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    app.get("/", (req, res) => {
        res.render("home");
    });

    app.get("/login", (req, res) => {
        res.render("login");
    });

    app.get("/register", (req, res) => {
        res.render("register");
    });

    app.get("/secrets", (req, res) => {
        if(req.isAuthenticated()){
            res.render("secrets");
        }
        else{
           res.redirect("/login");
        }
    });

    app.get("/logout", (req, res) => {
        req.logout(() => {
            res.redirect("/");
        });
    });

    app.post("/register", (req, res) => {
        User.register({username: req.body.username}, req.body.password, (err, user) => {
            if(err){
                console.log(err);
                res.redirect("/register");
            }
            else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets");
                });
            }
        });
    });

    app.post("/login", (req, res) => {
        const user = new User ({
            username: req.body.email,
            password: req.body.password
        });
        req.login(user, err => {
            if(err){
                console.log(err);
            }
            else{
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets");
                });
            }
        });
    });


    app.listen(3000, () => {
        console.log("Running on port 3000");
    });
}