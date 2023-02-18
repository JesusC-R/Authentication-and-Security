const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const {Schema} = require("mongoose");
const encrypt = require("mongoose-encryption");
const crypto = require("crypto");

const {createNullProtoObjWherePossible} = require("ejs/lib/utils");

const app = express();

mongoose.set("strictQuery", false);
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));


main().catch(err => console.log(err));

async function main(){
    const DataBaseName = "SecretsDB";

    await mongoose.connect("mongodb://127.0.0.1:27017/" + DataBaseName, {useNewUrlParser: true});

    const userSchema = new Schema({
        email: String,
        password: String
    });

    const encryptionKey = crypto.randomBytes(32).toString("base64");
    const signInKey = crypto.randomBytes(64).toString("base64");

    // This plugin has to be placed before creating the User model
    userSchema.plugin(encrypt, {
        encryptedFields: ["password"],
        additionalAuthenticatedFields: ["email"],
        encryptionKey: encryptionKey,
        signingKey: signInKey,
        requireAuthenticationCode: null
    });


    const User = mongoose.model("User", userSchema);

    User.find((err, data) => {
        if(!err){
            console.log(data);
        }
        else{
            console.log(err);
        }
    });

    app.get("/", (req, res) => {
        res.render("home");
    });

    app.get("/login", (req, res) => {
        res.render("login");
    });

    app.get("/register", (req, res) => {
        res.render("register");
    })


    app.post("/register", (req, res) => {
        const userEmail = req.body.username;
        const userPassword = req.body.password;

        const newUser = new User({
            email: userEmail,
            password: userPassword
        });
        newUser.save(err => {
            if(!err){
                res.render("secrets");
            }
            else{
                console.log(err);
            }
        });
    });

    app.post("/login", (req, res) => {
        const userEmail = req.body.username;
        const userPassword = req.body.password;

        User.findOne({email: userEmail}, (err, userFound) => {
            if(!err){
                if(userFound) {
                    if (userPassword === userFound.password) {
                        res.render("secrets");
                    } else {
                        console.log("Incorrect Password");
                    }
                }
                else{
                    console.log("User Not Found");
                }
            }
            else{
                console.log(err);
            }
        });
    });


    app.listen(3000, () => {
        console.log("Running on port 3000");
    });
}