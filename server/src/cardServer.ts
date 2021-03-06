import WebSocket from "ws";
import { Server } from "http";
import { Game, GameState, Player } from "./game";

export class CardServer {
    players: Player[] = [];
    games: Game[] = [new Game("game0", 4)];
    anyGameIndex = 0;
    server: WebSocket.Server;

    constructor(server: Server) {
        console.log("starting websocket server");
        this.server = new WebSocket.Server({ path: "/ws", server: server });
        this.server.on("connection", this.handleConnection.bind(this));
    }

    handleConnection(socket: WebSocket) {
        console.log("connection");

        if (socket.protocol !== "cards") {
            socket.close(1000, "unsupported protocol");
            return;
        }

        socket.on("close", () => {
            var player = this.players.find((pl) => pl.socket === socket);
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
                var player = this.players.find((pl) => pl.socket === socket);

                switch (args[0]) {
                    case "gamestate": {
                        if (!player || !player.joinedGame) {
                            console.warn("game or player does not exist");
                            continue;
                        }
                        player.joinedGame.setGameState(args[1] as GameState);
                        continue;
                    }

                    case "gamestatevote": {
                        if (!player || !player.joinedGame) {
                            console.warn("game or player does not exist");
                            continue;
                        }
                        player.joinedGame.voteSetGameState(args[1] as GameState);
                        continue;
                    }

                    case "setplayer": {
                        if (player) {
                            player.name = args[1];
                            continue;
                        }
                        var existingPlayer = this.players.find((pl) => pl.name == args[1]);
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
                            this.players.push(player);
                        }
                        continue;
                    }

                    case "joinany": {
                        var game = this.games[this.anyGameIndex];
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
                            game = new Game("game" + ++this.anyGameIndex, 4);
                            this.games.push(game);
                            game.letJoin(player);
                        }
                        socket.send("setmaster " + game.players[0].name);
                        continue;
                    }

                    case "join": {
                        var game = this.games[parseInt(args[1])];
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
                    }

                    case "leave": {
                        if (!player || !player.joinedGame) {
                            console.warn("cannot leave nothing");
                            continue;
                        }
                        if (!player.joinedGame.letLeave(player)) {
                            console.warn("could not leave");
                        }
                        continue;
                    }

                    case "close": {
                        socket.close();
                        continue;
                    }

                    case "broadcastall":
                    case "broadcast": {
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
                    }

                    default: {
                        console.error("unknown command", command);
                        continue;
                    }
                }
            }
        });

        console.log("connection was made.", socket.protocol);
    }
}
