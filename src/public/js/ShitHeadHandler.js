class ShitHeadHandler extends GameScene
{
    constructor(localPlayerName)
    {
        super(localPlayerName);

        this.registerCommand("turn", (args) => this.setTurn(args[1]));
    }
    
    preload() 
    {
        super.preload();
        this.load.spritesheet("cards", "/img/cards2.png", { frameWidth: 150, frameHeight: 200 });
        this.load.spritesheet("explosion", "/img/explosion.png", { frameWidth: 64, frameHeight: 64 });
    }

    create() 
    {
        super.create();
        
        const turnTextStyle = {padding: 3, fontSize: 20, fixedWidth: 0.5 * this.game.config.width, align: "center", fontFamily: "Wellfleet", color: "#999"};
        this.turnText = this.add.text(0.25 * this.game.config.width, 0.35 * this.game.config.height, "Waiting...", turnTextStyle);
        this.turnText.setDepth(100000000);
        
        const gameModeButtonStyle = {backgroundColor: "#721", padding: 6, fontSize: 12, fixedWidth: 0.4 * this.game.config.width, align: "center", fontFamily: "Wellfleet"};
        this.gameModeButton = this.add.text(0.3 * this.game.config.width, 0.6 * this.game.config.height, "Gamemode: Normal", gameModeButtonStyle);
        this.gameModeButton.setInteractive();
        this.gameModeButton.on("pointerdown", () => {
            
            if (this.gameModeButton.text === "Gamemode: Normal")
                this.gameModeButton.text = "Gamemode: NO U";
            else if (this.gameModeButton.text === "Gamemode: NO U")
                this.gameModeButton.text = "Gamemode: One 10";
            else if (this.gameModeButton.text === "Gamemode: One 10")
                this.gameModeButton.text = "Gamemode: Instafinal";
            else if (this.gameModeButton.text === "Gamemode: Instafinal")
                this.gameModeButton.text = "Gamemode: Jokerparty";
            else if (this.gameModeButton.text === "Gamemode: Jokerparty") 
                this.gameModeButton.text = "Gamemode: Trashmode";
            else if (this.gameModeButton.text === "Gamemode: Trashmode")
                this.gameModeButton.text = "Gamemode: Normal";
        });
        this.gameModeButton.visible = false;
        this.gameModeButton.setDepth(100000000);
        
        const readyButtonStyle = {backgroundColor: "#271", padding: 6, fontSize: 20, fixedWidth: 0.4 * this.game.config.width, align: "center", fontFamily: "Wellfleet"};
        this.readyButton = this.add.text(0.3 * this.game.config.width, 0.65 * this.game.config.height, "Ready", readyButtonStyle);
        this.readyButton.setInteractive();
        this.readyButton.text = "Start Game";
        this.readyButton.on("pointerdown", () => {

            this.readyButton.visible = false;
            this.gameModeButton.visible = false;
            this.server.send("gamestate startOfGame");
        });
        this.readyButton.visible = false;
        this.readyButton.setDepth(100000000);

        
        var takeStack = this.createNormalStack("take", 0, 0).setAngle(-45);
        takeStack.cardAmountText = this.add.text(5, 0, "", {fontSize: 20, fontFamily: "Pacifico"});
        takeStack.cardAmountText.setDepth(100000000);

        var throwStack = this.createNormalStack("throw", 0.5, 0.5);
        this.anims.create({
            key: "explode",
            frames: this.anims.generateFrameNumbers("explosion"),
            frameRate: 60
        })
        this.explosion = this.add.sprite(throwStack.x, throwStack.y, "explosion");
        this.explosion.setScale((this.game.config.width / this.explosion.width) / 2);
        this.explosion.setFrame(24);
        
        this.playerWon = null;
        this.createStacksForPlayer(this.localPlayer);
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

    onJoin(player)   // called when a new player joined 
    {
        console.log("onJoin", player.name);

        if (this.players.length > 1 && this.isDealer())
        {
            this.gameModeButton.visible = true;
            this.readyButton.visible = true;
        }

        this.createStacksForPlayer(player);
    }

    createStacksForPlayer(player)
    {
        if (this.players.length === 1) // create inventories for the local/first player
        {
            player.playerNameText = this.add.text(0.25 * this.game.config.width, 0.72 * this.game.config.height, "YOU", {fixedWidth: 0.5 * this.game.config.width, align: "center", fontSize: 16, fontFamily: "Pacifico"});
            player.finalStack1 = this.createNormalStack("inventory_final1", 0.2, 0.85, player);
            player.finalStack2 = this.createNormalStack("inventory_final2", 0.5, 0.85, player);
            player.finalStack3 = this.createNormalStack("inventory_final3", 0.8, 0.85, player);
            player.inventory = this.createInventoryStack("inventory", 0.5, 0.95, player);
        }
        else if (this.players.length === 2) // create inventories for the second player
        { 
            player.playerNameText = this.add.text(0.02 * this.game.config.width, 0.62 * this.game.config.height, player.name, {fixedWidth: 0.5 * this.game.config.width, align: "left", fontSize: 16, fontFamily: "Pacifico"});
            player.finalStack1 = this.createNormalStack("inventory_final1", 0.07, 0.25, player);
            player.finalStack1.setAngle(90);
            player.finalStack2 = this.createNormalStack("inventory_final2", 0.07, 0.4, player);
            player.finalStack2.setAngle(90);
            player.finalStack3 = this.createNormalStack("inventory_final3", 0.07, 0.55, player);
            player.finalStack3.setAngle(90);
            player.inventory = this.createVerticalInventoryStack("inventory", 0, 0.4, player);
        }
        else if (this.players.length === 3) // create inventories for the third player
        {
            player.playerNameText = this.add.text(0.25 * this.game.config.width, 0.13 * this.game.config.height, player.name, {fixedWidth: 0.5 * this.game.config.width, align: "center", fontSize: 16, fontFamily: "Pacifico"});
            player.finalStack1 = this.createNormalStack("inventory_final3", 0.3, 0.04, player);
            player.finalStack2 = this.createNormalStack("inventory_final2", 0.5, 0.04, player);
            player.finalStack3 = this.createNormalStack("inventory_final1", 0.7, 0.04, player);
            player.inventory = this.createInventoryStack("inventory", 0.5, 0, player);
            player.inventory.cardRotationOffset = 180;
        }
        else if (this.players.length === 4) // create inventories for the fourth player
        {
            player.playerNameText = this.add.text(0.5 * this.game.config.width, 0.62 * this.game.config.height, player.name, {fixedWidth: 0.48 * this.game.config.width, align: "right", fontSize: 16, fontFamily: "Pacifico"});
            player.finalStack1 = this.createNormalStack("inventory_final3", 0.93, 0.25, player);
            player.finalStack1.setAngle(-90);
            player.finalStack2 = this.createNormalStack("inventory_final2", 0.93, 0.4, player);
            player.finalStack2.setAngle(-90);
            player.finalStack3 = this.createNormalStack("inventory_final1", 0.93, 0.55, player);
            player.finalStack3.setAngle(-90);
            player.inventory = this.createVerticalInventoryStack("inventory", 1, 0.4, player);
            player.inventory.cardRotationOffset = -90;
        }
        else
        {
            console.error("invalid player count", this.players.length);
            return;
        }
    }

    onLeft(player)     // called when a player leaves
    {
        console.log("onLeft", player.name);

        if (this.gameState === "waiting")
        {
            if (this.players.length < 2)
                this.readyButton.visible = false;
        }

        player.playerNameText.destroy();
        player.inventory.destroy();
        player.finalStack1.destroy();
        player.finalStack2.destroy();
        player.finalStack3.destroy();
    }

    isDealer()
    {
        return this.isMaster(this.localPlayer);
    }

    getPlayerWithLowestCard() 
    {
        function getCardValue(card)
        {
            var value = card.cardValue;
            if (value < 3)
                value += 13;

            return card.cardType + (value - 3) * 4;
        }

        var lowestValue = 10000000000, lowestPlayer = null;
        this.players.forEach((player) => {
            player.inventory.containingCards.forEach((invCard) => {
                var value = getCardValue(invCard);
                if (value < lowestValue)
                {
                    lowestValue = value;
                    lowestPlayer = player;
                }
            });
        });

        return lowestPlayer;
    }

    onGameStateChange(newState)
    {
        console.log("new game state", newState);

        if (newState === "startOfGame")
        {
            this.readyButton.text = "Ready";
            this.readyButton.visible = true;
            this.readyButton.removeListener("pointerdown");
            this.readyButton.on("pointerdown", () => {

                this.readyButton.visible = false;
                this.server.send("gamestatevote inGame");
            });
            this.turnText.text = "Switching...";
            this.turnText.setColor("#ff0");

            // the player inventory can only receive card from the deck
            this.players.forEach((player) => {

                var cardGoFinalStackContition = (newCard) => newCard.snappedToStack.stackName === "take";
                player.finalStack1.onCardWantsToGoHere = cardGoFinalStackContition;
                player.finalStack2.onCardWantsToGoHere = cardGoFinalStackContition;
                player.finalStack3.onCardWantsToGoHere = cardGoFinalStackContition;
                
                player.finalStack1.onAddingCardToTop = (newCard) => {

                    if (player.finalStack1.containingCards.length === 1)
                        newCard.flipCard(true); // flip the card if it is the second on the stack
                };
                player.finalStack2.onAddingCardToTop = (newCard) => {

                    if (player.finalStack2.containingCards.length === 1)
                        newCard.flipCard(true); // flip the card if it is the second on the stack
                };
                player.finalStack3.onAddingCardToTop = (newCard) => {

                    if (player.finalStack3.containingCards.length === 1)
                        newCard.flipCard(true); // flip the card if it is the second on the stack
                };

                // it should only be switched if the card came from the players inventory
                var switchTopCardCondition = (newTopCard, _oldTopCard) => newTopCard.snappedToStack.stackName === "inventory" && newTopCard.snappedToStack.stackOwner === player;
                var switchTopCardEvent = (newTopCard, oldTopCard) => {
                    
                    newTopCard.flipCard(true);
                    oldTopCard.flipCard(player == this.localPlayer);
                }

                player.finalStack1.onCardWantsToSwitchWithTop = switchTopCardCondition;
                player.finalStack1.onSwitchingCardWithTop = switchTopCardEvent;
                player.finalStack1.moveHereMode = "switchTop";
                player.finalStack2.onCardWantsToSwitchWithTop = switchTopCardCondition;
                player.finalStack2.onSwitchingCardWithTop = switchTopCardEvent;
                player.finalStack2.moveHereMode = "switchTop";
                player.finalStack3.onCardWantsToSwitchWithTop = switchTopCardCondition;
                player.finalStack3.onSwitchingCardWithTop = switchTopCardEvent;
                player.finalStack3.moveHereMode = "switchTop";

                player.inventory.onAddedCardToTop = (newCard) => {
                    newCard.flipCard(player === this.localPlayer);
                    //return newCard.snappedToStack.stackName === "take";
                };

                // the player can only move from its own inventory of card
                if (player === this.localPlayer)
                {
                    player.inventory.onGetAllowedCardStacks = () => {
                        // the player can move cards from their inventory to the following stacks
                        return [
                            this.getStack("inventory_final1", player),
                            this.getStack("inventory_final2", player),
                            this.getStack("inventory_final3", player)
                        ];
                    };
                }
            });

            const throwStack = this.getStack("throw");
            throwStack.onCardWantsToGoHere = (card) => {

                function getCardValue(card)
                {
                    return card.cardType + (Math.max(card.cardValue, 3) - 3) * 4;
                }

                var cardValue = getCardValue(card);
                var lowestValue = 10000000000;
                this.players.forEach((player) => {
                    player.inventory.containingCards.forEach((invCard) => {
                        var value = getCardValue(invCard);
                        if (value < lowestValue)
                            lowestValue = value;
                    });
                });

                return cardValue <= lowestValue; // only the player with the lowest cast should begin
            };

            if (this.isDealer())
            {
                console.log("im dealer, dealing cards...");

                // creating card strings, shuffling them, then sending to clients
                var cards = [];
                for (let i = 0; i < 52; i++) 
                   cards.push(Math.floor(i / 13) + ":" + (i % 13 + 1));
                cards.push("4:0");
                cards.push("4:0");

                console.log("gamemode", this.gameModeButton.text);
                if (this.gameModeButton.text === "Gamemode: One 10") // add 4 extra 10s
                {
                    cards = cards.filter((card) => !card.endsWith(":10"));
                    cards.push("0:10");
                }
                else if (this.gameModeButton.text === "Gamemode: NO U") // add an extra 4 7s and 4 aces.
                {
                    for(let j = 0; j < 4; j++)
                    {
                        cards.push((j % 4) + ":7");
                        cards.push((j % 4) + ":1");
                    }
                }
                else if (this.gameModeButton.text === "Gamemode: Instafinal") // start the finale immediately
                {
                    cards.splice(this.players.length * 9);
                }
                else if (this.gameModeButton.text === "Gamemode: Jokerparty") // add 6 extra jokers
                {
                    for(let j = 0; j < 12; j++)
                        cards.push("4:0");
                }
                else if (this.gameModeButton.text === "Gamemode: Trashmode") // add 4 extra 10s
                {
                    cards = [];
                    for (let i = 0; i < 52; i++) 
                    {
                        var value = (i % 13 + 1), type = Math.floor(i / 13);

                        if (value > 2 && value < 10)
                            cards.push(type + ":" + value);
                    }

                    for(let j = 0; j < 4; j++)
                        cards.push((j % 4) + ":3");
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
                    dealTo += stackToString(this.players[j].finalStack1)
                    + "," + stackToString(this.players[j].finalStack1)
                    + "," + stackToString(this.players[j].finalStack2)
                    + "," + stackToString(this.players[j].finalStack2)
                    + "," + stackToString(this.players[j].finalStack3)
                    + "," + stackToString(this.players[j].finalStack3)
                    + "," + stackToString(this.players[j].inventory)
                    + "," + stackToString(this.players[j].inventory)
                    + "," + stackToString(this.players[j].inventory);
                }

                this.server.send("broadcastall deal 1 take " + dealTo);
            }
        }
        else if (newState === "inGame")
        {
            this.readyButton.removeListener("pointerdown");
            this.readyButton.text = "Next";
            this.readyButton.visible = false;
            this.readyButton.on("pointerdown", () => {

                this.server.send("broadcastall turn " + this.getNextTurnPlayer(this.skipTurns).name);
                this.readyButton.visible = false;
            });

            this.previouslyThrownValueThisRound = null;

            var burnStack = this.createNormalStack("burned", 1, 0);
            burnStack.setAngle(45)
            burnStack.onCardWantsToGoHere = (newCard) => newCard.snappedToStack.stackName === "throw";

            this.players.forEach((player) => {

                player.inventory.onGetAllowedCardStacks = () => [this.getStack("throw")];
                player.inventory.onAddingCardToTop = (newCard) => {

                    newCard.snapToEase = this.gameState === "inGame" ? "Bounce" :"Back";
                };
                player.inventory.onAddedCardToTop = (newCard) => {

                    newCard.snapToEase = "Back";
                    newCard.flipCard(player === this.localPlayer);
                };
                player.finalStack1.onGetAllowedCardStacks = () => [this.getStack("throw")];
                player.finalStack2.onGetAllowedCardStacks = () => [this.getStack("throw")];
                player.finalStack3.onGetAllowedCardStacks = () => [this.getStack("throw")];
            });

            var throwStack = this.getStack("throw");
            throwStack.onCardWantsToGoHere = (newCard) => {

                if (!this.isAtTurn())
                {
                    console.log("NOT AT TURN");
                    return false;
                }
                else if (newCard.snappedToStack.stackOwner !== this.localPlayer)
                {
                    console.log("CANNOT TAKE CARD OF OTHER PLAYER")
                    return false;
                }

                const mayThrow = this.canPlay(newCard, this.localPlayer);
                if (this.getPlayerStage(this.localPlayer) === 2) // if final hidden stack move
                {
                    if (!mayThrow)
                    {
                        if (this.previouslyThrownValueThisRound === null)
                            newCard.flipCard(true);
                        setTimeout(() => newCard.flipCard(false), 2000);
                        this.takeThrowStack();
                    }

                    this.previouslyThrownValueThisRound = newCard.cardValue;
                    return mayThrow;
                }
                else
                {
                    return mayThrow;
                }
            };
            throwStack.onAddingCardToTop = (newCard) => {

                newCard.snapToEase = "Cubic";
                this.previouslyThrownValueThisRound = newCard.cardValue;
                newCard.flipCard(true);
            };
            throwStack.onAddedCardToTop = (newCard) => {

                const burn = newCard.cardValue === 10 || throwStack.areTopCardsSameValue(4) || (newCard.cardType === JOKER && throwStack.areTopCardsSameValue(2)); // if the top 4 cards are the same, or a 10 is thrown, burn it
                if (burn) 
                {
                    console.log("BURN!!");
                    this.explosion.anims.play("explode");
                    this.dealCards(throwStack, [this.getStack("burned")], throwStack.containingCards.length);
                    this.previouslyThrownValueThisRound = null;
                    this.takeMinCards();
                }  
                else if (newCard.cardValue === 8)
                {
                    this.skipTurns++;
                }

                var playerStage = this.getPlayerStage(this.playerAtTurn);
                if (playerStage === 3) // if player is out
                {
                    this.playerAtTurn.playerNameText.setColor("#f0f");
                    if (!this.playerWon)
                        this.playerWon = this.playerAtTurn;
                    if (this.players.filter((pl) => this.getPlayerStage(pl) === 3).length >= this.players.length - 1)
                    {
                        this.turnText.text = this.playerWon.name + " won!";
                        this.turnText.setColor("#f0f");
                        this.readyButton.visible = false;
                        return;
                    }
                }

                if (this.isAtTurn()) // only the player at turn should run the following code
                {
                    if (this.turnStartPlayerStage !== playerStage)
                    {
                        this.turnStartPlayerStage = playerStage;
                        this.previouslyThrownValueThisRound = null;
                    }

                    if (!burn)
                    {
                        this.readyButton.visible = true;
                    }
                }
            };

            // the player with the lowest card may start
            this.setTurn(this.getPlayerWithLowestCard().name);
        }
    }

    takeThrowStack()
    {
        var throwStack = this.getStack("throw");
        this.server.send("broadcast deal " + throwStack.containingCards.length + " throw " + stackToString(this.localPlayer.inventory) + "|broadcastall turn " + this.getNextTurnPlayer().name);
        this.dealCards(throwStack, [this.localPlayer.inventory], throwStack.containingCards.length);
        this.readyButton.visible = false;
    }

    takeMinCards(amount = 3)
    {
        const playerInvCards = this.localPlayer.inventory.containingCards.length;
        if (playerInvCards < amount)
        {
            this.server.send("broadcast deal " + (amount - playerInvCards) + " take " + stackToString(this.localPlayer.inventory));
            this.dealCards(this.getStack("take"), [this.localPlayer.inventory], amount - playerInvCards);
        }
    }

    getPlayerStage(player) // normal(0), final(1), hiddenfinal(2) or done(3)
    {
        if (!player.inventory.isEmpty() || !this.getStack("take").isEmpty())
            return 0;
        
        var finalCount = player.finalStack1.containingCards.length 
            + player.finalStack2.containingCards.length 
            + player.finalStack3.containingCards.length;

        if (finalCount > 3)
            return 1;
        else if (finalCount > 0)
            return 2;
        else 
            return 3;
    }

    countCardValues(player, value)
    {
        var playerStage = this.getPlayerStage(player);

        function getCardValue(card)
        {
            if (!card)
                return 0;
            else
                return card.cardValue;
        }

        if (playerStage === 0)
        {
            return player.inventory.countCardValues(value);
        }
        else if (playerStage === 1)
        {
            return (getCardValue(player.finalStack1.containingCards[1]) === value ? 1 : 0)
                + (getCardValue(player.finalStack2.containingCards[1]) === value ? 1 : 0)
                + (getCardValue(player.finalStack3.containingCards[1]) === value ? 1 : 0);
        }
        else if (playerStage === 2)
        {
            return (getCardValue(player.finalStack1.containingCards[0]) === value ? 1 : 0)
                + (getCardValue(player.finalStack2.containingCards[0]) === value ? 1 : 0)
                + (getCardValue(player.finalStack3.containingCards[0]) === value ? 1 : 0);
        }
        else
        {
            return 0;
        }
    }

    onTurnWillEnd(playerTurnEnd)
    {
        playerTurnEnd.playerNameText.setColor("#fff");
        
        if (this.isAtTurn())
            this.takeMinCards();

        setTimeout(() => playerTurnEnd.inventory.sortCardsPerValue(), 750);
    }

    onTurnStart(playerAtTurn)
    {
        this.previouslyThrownValueThisRound = null;
        this.turnStartPlayerStage = this.getPlayerStage(playerAtTurn);
        this.turnText.text = playerAtTurn.name + "'s turn!";
        this.turnText.setColor(this.isAtTurn() ? "#0f0" : "#fff");
        this.skipTurns = 1;
        playerAtTurn.playerNameText.setColor("#0f0");

        if (this.isAtTurn())
        {
            var shouldTryThrow = false;
            if (this.turnStartPlayerStage === 0)
            {
                shouldTryThrow = !this.localPlayer.inventory.containingCards.every((card) => !this.canPlay(card, this.localPlayer));
            }
            else if (this.turnStartPlayerStage === 1)
            {
                shouldTryThrow = this.canPlay(this.localPlayer.finalStack1.containingCards[1], this.localPlayer)
                    || this.canPlay(this.localPlayer.finalStack2.containingCards[1], this.localPlayer)
                    || this.canPlay(this.localPlayer.finalStack3.containingCards[1], this.localPlayer);
            }
            else if (this.turnStartPlayerStage === 2)
            {
                shouldTryThrow = true;
            }
            else
            {
                // this player is out, go to next player
                this.server.send("broadcastall turn " + this.getNextTurnPlayer().name);
                return;
            }

            this.turnText.text = "Your turn!";
            this.tweens.add({
                targets: this.turnText,
                yoyo: true,
                y: 0.3 * this.game.config.height,
                scaleX: 1.4,
                scaleY: 1.4,
                duration: 400,
                hold: 200,
                ease: "Cubic"
            });

            if (!shouldTryThrow)
            {
                this.turnText.text = "Oof";
                setTimeout(() => this.takeThrowStack(), 500);
            }
            else
            {
                this.localPlayer.inventory.containingCards.filter((card) => this.canPlay(card, this.localPlayer)).forEach((card) => {
                    console.log("You can lay ", card.cardType, card.cardValue);
                });
            }
        }
        else
        {
            this.turnText.text = playerAtTurn.name + "'s turn!";
        }
    }

    canPlay(card, player) { // <-- only called if the local player relocates a card

        if (!card)
            return false;

        var cardValue = card.cardValue;
        if (cardValue === 1)
            cardValue = 14;

        var throwStack = this.getStack("throw");
        var takeStack = this.getStack("take");
        var cards = throwStack.containingCards.filter((c) => c.cardValue !== 7);    // <-- remove all sevens because they are transparent
        var underlayingCard = cards.length === 0 ? null : cards[cards.length - 1];
        var underlayingValue = underlayingCard == null ? 0 : underlayingCard.cardValue;
        var underlayingType = underlayingCard == null ? null : underlayingCard.cardType;
        if (underlayingValue === 1) // the ace has a value of 14, not 1
            underlayingValue = 14;

        const playerStage = this.getPlayerStage(player);  
        if (playerStage === 0) // if normal inventory move
        {
            if (card.snappedToStack !== player.inventory)
                return false;
        }
        else if (playerStage === 1) // if final stack move
        {
            if (card.snappedToStack.containingCards.length !== 2)
                return false;
        }
        else if (playerStage === 2) // if final hidden stack move
        {
            if (card.snappedToStack.containingCards.length !== 1)
                return false;
        }

        if (throwStack.getTopCard() 
            && throwStack.getTopCard().cardValue === card.cardValue 
            && (throwStack.getSameValueDepthFromTop() + this.countCardValues(player, card.cardValue)) >= (card.cardType === JOKER ? 2 : 4)) // allow if can complete set
        {
            console.log("mayCardBeThrown()", "2 JOKERS or 4 OTHERS");
            return true;
        }
        else if (this.previouslyThrownValueThisRound !== null) // only allow doubles
        {
            console.log("YOU ALREADY THREW THIS ROUND!");
            return this.previouslyThrownValueThisRound === card.cardValue;
        }
        else if (cardValue === 7 || card.cardType === JOKER) // these cards can be thrown all the time
        {
            console.log("mayCardBeThrown()", "7 or JOKER");
            return true;
        }
        else if (underlayingType === JOKER) // only allow odd cards on jokers
        {
            console.log("mayCardBeThrown()", "underlaying JOKER");
            return cardValue % 2 === 1;
        }
        else if (underlayingValue === 9)    // only allow card values <= 9 on the 9
        {
            console.log("mayCardBeThrown()", "underlaying 9");
            return cardValue <= 9;
        }
        else if (cardValue === 2) // these cards can be thrown on all but the joker
        {
            console.log("mayCardBeThrown()", "2");
            return true;
        }
        else if (cardValue === 9 || cardValue === 10)
        {
            console.log("mayCardBeThrown()", "9 or 10");
            return underlayingValue !== 14;
        }
        else if (cardValue === 8 || cardValue === 3)
        {
            console.log("mayCardBeThrown()", "8 or 3");
            return cardValue >= underlayingValue;
        }
        else if (takeStack.isEmpty() && underlayingValue === 14 && cardValue === 5)
        {
            console.log("mayCardBeThrown()", "takeStack === 0 and underlaying 14 and 5");
            return true;
        }
        else
        {
            console.log("mayCardBeThrown()", "end", cardValue, ">", underlayingValue);
            return cardValue > underlayingValue;
        }
    };
}