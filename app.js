const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const {Schema} = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");

// Include the following packages to use Google Authentication
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
        password: String,
        googleId: String,
        secret: String
    });

    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);

    const User = mongoose.model("User", userSchema);


    // Required to serialize and deserialize user.
    passport.use(new LocalStrategy(User.authenticate()));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        })
    });


    passport.use(new GoogleStrategy({
            clientID: process.env.CLIENT_ID,  // Get access to CLIENT_ID and CLIENT_SECRET at Google developers console website
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/secrets",
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
        },
        function(accessToken, refreshToken, profile, cb) {
            User.findOrCreate({ googleId: profile.id }, function (err, user) {
                return cb(err, user);
            });
        }
    ));

    app.get("/", (req, res) => {
        res.render("home");
    });

    app.get("/auth/google",
        passport.authenticate("google", { scope: ["profile"] })
    );

    app.get("/auth/google/secrets",  // Use url specified at the Google developers console website
        passport.authenticate("google", { failureRedirect: "/login" }),
        (req, res) => {
        res.redirect("/secrets");
        }
    );

    app.get("/login", (req, res) => {
        res.render("login");
    });

    app.get("/register", (req, res) => {
        res.render("register");
    });

    app.get("/secrets", (req, res) => {
        User.find({"secret": {$ne: null}}, (err, foundUsers) => {
            if(err){
                console.log(err);
            }
            else {
                if(foundUsers){
                    res.render("secrets", {usersWithSecrets: foundUsers})
                }
            }
        });
    });

    app.get("/submit", (req, res) => {
        if(req.isAuthenticated()){
            res.render("submit");
        }
        else{
            res.redirect("/login");
        }
    });
    app.post("/submit", (req, res) => {
        const submittedSecret = req.body.secret;

        User.findById(req.user.id, (err, foundUser) => {
            if(err){
                console.log(err);
            }
            else {
                if(foundUser){
                    foundUser.secret = submittedSecret;
                    foundUser.save( () => {
                        res.redirect("/secrets");
                    });
                }
            }
        });
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