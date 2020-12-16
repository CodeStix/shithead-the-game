import ws from "ws";
import { Game, Player } from "./game";

let players: Player = [];
let games: Game[] = [new Game("game0", 4)];
let anyGameIndex = 0;
console.log("starting websocket server");

let server = new ws.Server({ port: 81 });
server.on("connection", (socket) => {
    console.log("connection");

    if (socket.protocol !== "cards") {
        socket.close(1000, "unsupported protocol");
        return;
    }

    socket.on("close", (code, reason) => {
        var player = players.find((pl) => pl.socket === socket);
        if (player) {
            if (player.joinedGame) {
                console.log("leaving game due to socket close...", player.name);
                player.joinedGame.letLeave(player);
            }
        }
    });

    socket.on("message", (message) => {
        var commands = (message as string).split("|");
        console.log("received: %s", commands);

        for (let i = 0; i < commands.length; i++) {
            var command = commands[i].trim();
            if (command.length === 0) continue;
            var args = command.split(" ");
            var player = players.find((pl) => pl.socket === socket);

            switch (args[0]) {
                case "gamestate":
                    if (!player || !player.joinedGame) {
                        console.warn("game or player does not exist");
                        continue;
                    }
                    player.joinedGame.setGameState(args[1]);
                    continue;

                case "gamestatevote":
                    if (!player || !player.joinedGame) {
                        console.warn("game or player does not exist");
                        continue;
                    }
                    player.joinedGame.voteSetGameState(args[1]);
                    continue;

                case "setplayer":
                    if (player) {
                        player.name = args[1];
                        continue;
                    }
                    var existingPlayer = players.find((pl) => pl.name == args[1]);
                    if (existingPlayer) {
                        console.log("player overtook lingering socket", existingPlayer.name);
                        existingPlayer.socket.close();
                        existingPlayer.socket = socket;
                        continue;
                    } else {
                        player = {
                            name: args[1],
                            socket: socket,
                            joinedGame: null,
                        };
                        players.push(player);
                    }
                    continue;

                case "joinany":
                    var game = games[anyGameIndex];
                    if (!game || !player) {
                        console.warn("game or player does not exist");
                        socket.close(1011, "game or player doesn't exist");
                        break;
                    }
                    if (player.joinedGame !== null) {
                        console.warn("player already in a game, leaving previous game...", player.name);
                        player.joinedGame.letLeave(player);
                    }
                    if (game.inGame() || !game.letJoin(player)) {
                        console.warn("cannot join, creating new game...");
                        game = new Game("game" + ++anyGameIndex, 4);
                        games.push(game);
                        game.letJoin(player);
                    }
                    socket.send("setmaster " + game.players[0].name);
                    continue;

                case "join":
                    var game = games[parseInt(args[1])];
                    if (!game || !player) {
                        console.warn("game or player does not exist");
                        socket.close(1011, "game or player doesn't exist");
                        break;
                    }
                    if (game.inGame()) {
                        socket.close(1011, game.name + " already started");
                        break;
                    }
                    if (player.joinedGame !== null) {
                        console.warn("player already in a game, leaving previous game...", player.name);
                        player.joinedGame.letLeave(player);
                    }
                    if (!game.letJoin(player)) {
                        console.warn(player.name, "cannot join", game.name);
                        socket.close(1011, "cannot join room " + game.name);
                        break;
                    }
                    socket.send("setmaster " + game.players[0].name);
                    continue;

                case "leave":
                    if (!player || !player.joinedGame) {
                        console.warn("cannot leave nothing");
                        continue;
                    }
                    if (!player.joinedGame.letLeave(player)) {
                        console.warn("could not leave");
                    }
                    continue;

                case "close":
                    socket.close();
                    continue;

                case "broadcastall":
                case "broadcast":
                    var includeSender = args[0] === "broadcastall";
                    if (!player || !player.joinedGame) {
                        console.warn("cannot broadcast in nothing");
                        continue;
                    }
                    for (let j = 0; j < player.joinedGame.players.length; j++) {
                        if (includeSender || player.joinedGame.players[j] !== player)
                            player.joinedGame.players[j].socket.send(args.slice(1).join(" "));
                    }
                    continue;

                default:
                    console.error("unknown command", command);
                    continue;
            }
        }
    });

    console.log("connection was made.", socket.protocol);
});
