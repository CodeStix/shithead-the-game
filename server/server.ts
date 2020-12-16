/// <reference path="global.d.ts" />

import express, { ErrorRequestHandler, NextFunction } from "express";
import expressSession from "express-session";
import path from "path";
import { CardServer } from "./cardServer";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
    expressSession({
        secret: "r!?N&Q6$8%Xg5J3s",
        resave: true,
        saveUninitialized: true,
    })
);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "twig");

app.get("/", (req, res, next) => {
    var problems: string[] = [];
    if (req.query.problem) {
        switch (req.query.problem) {
            case "invalid-player-name":
                problems = ["An invalid player name was given, please specify a name containing only a-z0-9_@&+.,?-"];
                break;
            case "no-player":
                problems = ["Please enter a name before entering the game!"];
                break;
            case "invalid-game-name":
                problems = ["An invalid game name was given, please specify a name containing only a-z0-9_@&+.,?-"];
                break;
        }
    }

    res.render("index", {
        playerName: req.session.playerName,
        problems: problems,
    });
});

app.post("/setName", (req, res, next) => {
    const playerName = req.body.name;
    if (!playerName || !playerName.match(/^[a-z0-9_@&+.,?-]{1,12}$/i))
        return res.redirect("/?problem=invalid-player-name");

    req.session.playerName = playerName;
    res.redirect("/");
});

app.get("/logout", (req, res, next) => {
    req.session.destroy(() => {});
    res.redirect("/");
});

app.get("/game", (req, res, next) => {
    const gameName = (req.query.gameName as string) || "ShitHead";
    if (!gameName.match(/^[a-z0-9_]{1,32}$/i)) return res.redirect("/?problem=invalid-game-name");
    if (!req.session.playerName) return res.redirect("/?problem=no-player");

    res.render("game", {
        gameName: gameName,
        playerName: req.session.playerName,
    });
});

let errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    res.json({
        status: "error",
        message: err.message,
    });
};
app.use(errorHandler);

let server = app.listen(80);
new CardServer(server);
