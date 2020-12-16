cardTypeValueToSpriteFrame = function(cardType, cardValue, cardVisible) 
{
    if (!cardVisible)
        return 0;

    switch(cardType) 
    {
        case 0: // Special cards: 1-5 = choose color (black, yellow, red, blue, green), 6-10 = choose color +4 (black, yellow, red, blue, green)
            return cardValue;
        case 1: // Yellow
            return cardValue + 11
        case 2: // Red
            return cardValue + 11 + 13
        case 3: // Blue
            return cardValue + 11 + 13 * 2
        case 4: // Green
            return cardValue + 11 + 13 * 3
    }

    console.warn("no sprite for ", cardType, cardValue);
    return 0;
}

class UnoHandler extends GameScene 
{
    constructor(localPlayerName) 
    {
        super(localPlayerName);

        this.registerCommand("turn", (args) => this.setTurn(args[1]));
    }

    preload()
    {
        super.preload();
        this.load.spritesheet("cards", "/img/unocards.png",  { frameWidth: 168, frameHeight: 259 });
    }

    create()
    {
        super.create();

        this.createStacksForPlayer(this.localPlayer);

        var takeStack = this.createNormalStack("take", 0, 0).setAngle(-45);
        takeStack.cardAmountText = this.add.text(5, 0, "", {fontSize: 20, fontFamily: "Pacifico"});
        takeStack.cardAmountText.setDepth(100000000);

        var throwStack = this.createNormalStack("throw", 0.5, 0.5);
        throwStack.onCardWantsToGoHere = (card) => true;

        const startButtonStyle = {backgroundColor: "#271", padding: 6, fontSize: 20, fixedWidth: 0.4 * this.game.config.width, align: "center", fontFamily: "Wellfleet"};
        this.startButton = this.add.text(0.3 * this.game.config.width, 0.65 * this.game.config.height, "Ready", startButtonStyle);
        this.startButton.setInteractive();
        this.startButton.text = "Start Game";
        this.startButton.on("pointerdown", () => {

            this.startButton.visible = false;
            this.server.send("gamestate inGame");
        });
        this.startButton.visible = true;
        this.startButton.setDepth(100000000);
    }

    createStacksForPlayer(player)
    {
        if (this.players.length === 1)
        {
            player.playerNameText = this.add.text(0.25 * config.width, 0.72 * config.height, "YOU", {fixedWidth: 0.5 * config.width, align: "center", fontSize: 16, fontFamily: "Pacifico"});
            player.inventory = this.createInventoryStack("inventory", 0.5, 0.95, player);
        }
        else if (this.players.length === 2)
        {
            player.playerNameText = this.add.text(0.02 * config.width, 0.62 * config.height, player.name, {fixedWidth: 0.5 * config.width, align: "left", fontSize: 16, fontFamily: "Pacifico"});
            player.inventory = this.createVerticalInventoryStack("inventory", 0, 0.4, player);
        }
        else if (this.players.length === 3)
        {
            player.playerNameText = this.add.text(0.25 * config.width, 0.13 * config.height, player.name, {fixedWidth: 0.5 * config.width, align: "center", fontSize: 16, fontFamily: "Pacifico"});
            player.inventory = this.createInventoryStack("inventory", 0.5, 0, player);
        }
        else if (this.players.length === 4)
        {
            player.playerNameText = this.add.text(0.5 * config.width, 0.62 * config.height, player.name, {fixedWidth: 0.48 * config.width, align: "right", fontSize: 16, fontFamily: "Pacifico"});
            player.inventory = this.createVerticalInventoryStack("inventory", 1, 0.4, player);
            player.inventory.cardRotationOffset = -90;
        }
    }

    onJoin(player)
    {
        this.createStacksForPlayer(player);
    }

    onLeft(player)
    {
        player.inventory.destroy();
    }

    setTurn(playerName)
    {
        if (this.playerAtTurn)
            this.onTurnWillEnd(this.playerAtTurn);
        this.playerAtTurn = this.getPlayerWithName(playerName);
        this.onTurnStart(this.playerAtTurn);
    }

    getNextTurnPlayer(turnsFurther = 1)
    {
        var currentIndex = this.players.findIndex((pl) => pl === this.playerAtTurn);

        var player;
        do
        {
            player = this.players[(currentIndex + turnsFurther++) % this.players.length];

        } while (this.getPlayerStage(player) === 3) // skip won players

        return player;
    }

    isAtTurn()
    {
        return this.playerAtTurn === this.localPlayer;
    }

    onTurnWillEnd(player) {}

    onTurnStart(player) {}

    onGameStateChange(newGameState)
    {
        if (newGameState === "inGame") 
        {
            if (this.isMaster(this.localPlayer))
            {
                const duplicates = 2;
                const dealtCards = 7;

                var cards = [];
                for (let d = 0; d < duplicates; d++) 
                {
                    for (let i = 0; i <= 13; i++) 
                    {
                       cards.push("1:" + i);
                       cards.push("2:" + i);
                       cards.push("3:" + i);
                       cards.push("4:" + i);
                    }
                    for (let i = 0; i < 4; i++) 
                    {
                        cards.push("0:1");
                        cards.push("0:6");
                    }
                }

                for (let i = cards.length - 1; i > 0; i--) 
                {
                    const j = Math.floor(Math.random() * (i + 1));
                    [cards[i], cards[j]] = [cards[j], cards[i]];
                }

                this.server.send("broadcastall fillstack take " + cards.join(","));

                var dealTo = "";
                for(let j = 0; j < this.players.length; j++)
                {
                    if (j !== 0)
                        dealTo += ",";
                    dealTo += stackToString(this.players[j].inventory);
                }

                this.server.send("broadcastall deal " + dealtCards + " take " + dealTo);
            }

            this.players.forEach(player => {
                player.inventory.onCardWantsToGoHere = (card) => this.isAtTurn() && card.snappedToStack.stackName === "take";
            });
        }
    }


    
}