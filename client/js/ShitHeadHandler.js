class ShitHeadHandler extends GameScene
{
    constructor(localPlayerName)
    {
        super(localPlayerName);

        this.registerCommand("turn", (args) => this.setTurn(args[1]));
    }

    create() 
    {
        super.create();
        //const playerNameTextStyle = {padding: 3, fontSize: 18, fixedWidth: 0.5 * this.game.config.width, align: "center"};
        //this.playerNameText = this.add.text(0.25 * this.game.config.width, 0.04 * this.game.config.height, this.localPlayer.name, playerNameTextStyle);
        //this.playerNameText.setDepth(1000000);
        const turnTextStyle = {padding: 3, fontSize: 16, fixedWidth: 0.5 * this.game.config.width, align: "center"};
        this.turnText = this.add.text(0.25 * this.game.config.width, 0.35 * this.game.config.height, "waiting", turnTextStyle);
        this.turnText.setDepth(1000000);
        const readyButtonStyle = {backgroundColor: "#271", padding: 6, fontSize: 20, fixedWidth: 0.4 * this.game.config.width, align: "center"};
        this.readyButton = this.add.text(0.3 * this.game.config.width, 0.65 * this.game.config.height, "Ready", readyButtonStyle);
        this.readyButton.setInteractive();
        this.readyButton.text = "Start Game";
        this.readyButton.on("pointerdown", () => {

            this.readyButton.visible = false;
            this.server.send("gamestate startOfGame"); //|broadcastall turn " + this.getPlayerWithLowestCard()
        });
        this.readyButton.visible = false;

        this.createNormalStack("take", 0, 0).setAngle(-45);
        this.createNormalStack("throw", 0.5, 0.5);

        this.createStacksForPlayer(this.localPlayer);
    }

    setTurn(playerName)
    {
        if (!this.playerAtTurn || playerName !== this.playerAtTurn.name)
        {
            this.playerAtTurn = this.getPlayerWithName(playerName);
            this.onTurnStart(this.playerAtTurn);
        }
    }

    getNextTurnPlayer(turnsFurther = 1)
    {
        var currentIndex = this.players.findIndex((pl) => pl === this.playerAtTurn);
        return this.players[(currentIndex + turnsFurther) % this.players.length];
    }

    isAtTurn()
    {
        return this.playerAtTurn === this.localPlayer;
    }

    onJoin(player)   // called when a new player joined 
    {
        console.log("join", player);

        if (this.players.length > 1 && this.isDealer())
            this.readyButton.visible = true;

        this.createStacksForPlayer(player);
    }

    createStacksForPlayer(player)
    {
        if (this.players.length === 1) // create inventories for the local/first player
        {
            player.finalStack1 = this.createNormalStack("inventory_final1", 0.2, 0.85, player.name);
            player.finalStack2 = this.createNormalStack("inventory_final2", 0.5, 0.85, player.name);
            player.finalStack3 = this.createNormalStack("inventory_final3", 0.8, 0.85, player.name);
            player.inventory = this.createInventoryStack("inventory", 0.5, 0.95, player.name);
        }
        else if (this.players.length === 2) // create inventories for the second player
        { 
            this.add.text(0, 0.65 * this.game.config.height, player.name, {fixedWidth: 0.5 * this.game.config.width, align: "left"});
            player.finalStack1 = this.createNormalStack("inventory_final1", 0.07, 0.25, player.name);
            player.finalStack1.setAngle(90);
            player.finalStack2 = this.createNormalStack("inventory_final2", 0.07, 0.4, player.name);
            player.finalStack2.setAngle(90);
            player.finalStack3 = this.createNormalStack("inventory_final3", 0.07, 0.55, player.name);
            player.finalStack3.setAngle(90);
            player.inventory = this.createVerticalInventoryStack("inventory", 0, 0.4, player.name);
        }
        else if (this.players.length === 3) // create inventories for the third player
        {
            this.add.text(0.5 * this.game.config.width, 0.65 * this.game.config.height, player.name, {fixedWidth: 0.5 * this.game.config.width, align: "right"});
            player.finalStack1 = this.createNormalStack("inventory_final3", 0.93, 0.25, player.name);
            player.finalStack1.setAngle(-90);
            player.finalStack2 = this.createNormalStack("inventory_final2", 0.93, 0.4, player.name);
            player.finalStack2.setAngle(-90);
            player.finalStack3 = this.createNormalStack("inventory_final1", 0.93, 0.55, player.name);
            player.finalStack3.setAngle(-90);
            player.inventory = this.createVerticalInventoryStack("inventory", 1, 0.4, player.name);
            player.inventory.cardRotationOffset = -90;
        }
        else if (this.players.length === 4) // create inventories for the fourth player
        {
            this.add.text(0.25 * this.game.config.width, 0.14 * this.game.config.height, player.name, {fixedWidth: 0.5 * this.game.config.width, align: "center"});
            player.finalStack1 = this.createNormalStack("inventory_final3", 0.3, 0.04, player.name);
            player.finalStack2 = this.createNormalStack("inventory_final2", 0.5, 0.04, player.name);
            player.finalStack3 = this.createNormalStack("inventory_final1", 0.7, 0.04, player.name);
            player.inventory = this.createInventoryStack("inventory", 0.5, 0, player.name);
            player.inventory.cardRotationOffset = 180;
        }
        else
        {
            console.error("invalid player count", this.players.length);
            return;
        }
    }

    onLeft(player)     // called when a player leaves
    {
        if (this.gameState === "waiting")
        {
            if (this.players.length < 2)
                this.readyButton.visible = false;

            player.inventory.destroy();
            player.finalStack1.destroy();
            player.finalStack2.destroy();
            player.finalStack3.destroy();
        }
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
                this.server.send("gamestatevote inGame"); //|broadcastall turn " + this.getPlayerWithLowestCard()
            });

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
                var switchTopCardCondition = (newTopCard, _oldTopCard) => newTopCard.snappedToStack.stackName === "inventory" && newTopCard.snappedToStack.stackOwner === player.name;
                var switchTopCardEvent = (newTopCard, oldTopCard) => {
                    
                    newTopCard.flipCard(true);
                    oldTopCard.flipCard(player.name == this.localPlayer.name);
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
                            this.getStack("inventory_final1", player.name),
                            this.getStack("inventory_final2", player.name),
                            this.getStack("inventory_final3", player.name)
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

                this.server.send("broadcastall turn " + this.getNextTurnPlayer().name);
                this.readyButton.visible = false;
            });

            this.previouslyThrownValueThisRound = null;

            var burnStack = this.createNormalStack("burned", 1, 0);
            burnStack.setAngle(45)
            burnStack.onCardWantsToGoHere = (newCard) => newCard.snappedToStack.stackName === "throw";

            this.players.forEach((player) => {

                player.inventory.onGetAllowedCardStacks = () => [this.getStack("throw")];
                player.inventory.onAddedCardToTop = (newCard) => {

                    newCard.flipCard(player === this.localPlayer);
                };
                player.finalStack1.onGetAllowedCardStacks = () => [this.getStack("throw")];
                player.finalStack2.onGetAllowedCardStacks = () => [this.getStack("throw")];
                player.finalStack3.onGetAllowedCardStacks = () => [this.getStack("throw")];
            });

            var throwStack = this.getStack("throw");
            throwStack.onCardWantsToGoHere = (newCard) => {

                if (!this.isAtTurn()) // a card should not go here if it is not your turn
                {
                    console.log("NOT AT TURN");
                    return false;
                }

                const mayThrow = this.mayCardBeThrown(newCard);
                const comesFromStack = newCard.snappedToStack;
                const inventoryIsEmpty = this.localPlayer.inventory.containingCards.length === 0;
                if ((comesFromStack === this.localPlayer.finalStack1 
                    || comesFromStack === this.localPlayer.finalStack2 
                    || comesFromStack === this.localPlayer.finalStack3))
                {
                    debugger;
                    if (!inventoryIsEmpty) // only allow the final stacks if the main inventory is empty
                        return false;
                    if (newCard !== comesFromStack.getTopCard()) // only the top card can be thrown
                        return false;
                    


                    if (comesFromStack.containingCards.length === 1) // this is a hidden final card
                    {
                        newCard.flipCard(true);
                        if (!mayThrow)
                        {
                            setTimeout(() => newCard.flipCard(false), 2000);
                            this.takeThrowStack();
                        }
                    }
                }

                if (!mayThrow)
                    console.log("MAY NOT BE THROWN!");
                return mayThrow;
            };
            throwStack.onAddingCardToTop = (newCard) => {

                this.previouslyThrownValueThisRound = newCard.cardValue;
                newCard.flipCard(true);

                if (newCard.snappedToStack.stackName === "inventory")
                {
                    if (newCard.snappedToStack.length === 1)
                    {
                        this.previouslyThrownValueThisRound = null;
                    }
                }
                /*else if (newCard.snappedToStack.stackName === "inventory_final1"
                    || newCard.snappedToStack.stackName === "inventory_final2"
                    || newCard.snappedToStack.stackName === "inventory_final3")
                {
                    if (newCard.snappedToStack.length === 1)
                    {
                        this.previouslyThrownValueThisRound = null;
                    }
                }*/
            };
            throwStack.onAddedCardToTop = (newCard) => {

                if (newCard.cardValue === 10 || throwStack.areTopCardsSameValue(4) || (newCard.cardType === JOKER && throwStack.areTopCardsSameValue(2))) // if the top 4 cards are the same, or a 10 is thrown, burn it
                {
                    console.log("BURN!!");
                    this.getStack("burned").tryMoveAllCards(throwStack.containingCards);
                    this.previouslyThrownValueThisRound = null;
                }  

                if (this.isAtTurn()) // only the player at turn should run the following code
                {
                    var playerInvCards = this.localPlayer.inventory.containingCards.length;
                    if (playerInvCards < 3)
                    {
                        console.log("Taking", 3 - playerInvCards, "cards");
                        this.dealCards(this.getStack("take"), [this.localPlayer.inventory], 3 - playerInvCards);
                        this.server.send("broadcast deal " + (3 - playerInvCards) + " take " + stackToString(this.localPlayer.inventory));
                    }

                    this.readyButton.visible = true;

                    /*if (this.previouslyThrownValueThisRound !== null)
                    {
                        // if there are duplicate cards left in the inventory, show a button so the player can choose if it doesn't want to throw them, else, nextturn automatically
                        if (this.localPlayer.inventory.containingCards.every((card) => card.cardValue !== this.previouslyThrownValueThisRound))
                        {
                            console.log("cant do anything");
                            this.server.send("broadcastall turn " + this.getNextTurnPlayer().name);
                        }
                        else
                        {
                            this.readyButton.visible = true;
                        }
                    }*/
                }
            };

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

    onTurnStart(playerAtTurn)
    {
        this.previouslyThrownValueThisRound = null;
        //debugger;
        //console.log(playerAtTurn.name, "is at turn!");
        this.turnText.text = playerAtTurn.name + "'s turn!";

        if (this.isAtTurn())
        {
            this.turnText.text = "Your turn!";

            var canThrow = false;
            if (!this.localPlayer.inventory.isEmpty())
            {
                canThrow = !this.localPlayer.inventory.containingCards.every((card) => !this.mayCardBeThrown(card));
            }
            else if (this.localPlayer.finalStack1.containingCards.length >= 2 // final cards
                || this.localPlayer.finalStack2.containingCards.length >= 2
                || this.localPlayer.finalStack1.containingCards.length >= 2)
            {
                canThrow = this.mayCardBeThrown(this.localPlayer.finalStack1.getTopCard())
                    || this.mayCardBeThrown(this.localPlayer.finalStack2.getTopCard())
                    || this.mayCardBeThrown(this.localPlayer.finalStack3.getTopCard());
            }
            else // hidden final cards
            {
                canThrow = true;
                /*this.mayCardBeThrown(this.localPlayer.finalStack1.getTopCard())
                || this.mayCardBeThrown(this.localPlayer.finalStack2.getTopCard())
                || this.mayCardBeThrown(this.localPlayer.finalStack3.getTopCard());*/
            }

            if (!canThrow)
            {
                console.log("Player cant do nothing in his turn! Has to take!");
                this.takeThrowStack();
            }
            else
            {
                this.localPlayer.inventory.containingCards.filter((card) => this.mayCardBeThrown(card)).forEach((card) => {
                    console.log("You can lay ", card.cardType, card.cardValue);
                });
            }
        }
        else
        {
            this.turnText.text = playerAtTurn.name + "'s turn!";
        }
    }

    mayCardBeThrown(newCard) { // <-- only called if the local player relocates a card

        var cardValue = newCard.cardValue;
        if (cardValue === 1)
            cardValue = 14;

        var throwStack = this.getStack("throw");
        var takeStack = this.getStack("take");
        var cards = throwStack.containingCards.filter((c) => c.cardValue != 7);    // <-- remove all sevens because they are transparent
        var underlayingCard = cards.length === 0 ? null : cards[cards.length - 1];
        var underlayingValue = underlayingCard == null ? 0 : underlayingCard.cardValue;
        var underlayingType = underlayingCard == null ? null : underlayingCard.cardType;
        if (underlayingValue === 1) // the ace has a value of 14, not 1
            underlayingValue = 14;

        if (this.previouslyThrownValueThisRound !== null) // only allow doubles
        {
            return this.previouslyThrownValueThisRound === newCard.cardValue;
        }
        else if (cardValue === 7 || newCard.cardType === JOKER) // these cards can be thrown all the time
        {
            return true;
        }
        else if (underlayingType === JOKER) // only allow odd cards on jokers
        {
            return cardValue % 2 === 1;
        }
        else if (underlayingValue === 9)    // only allow card values <= 9 on the 9
        {
            return cardValue <= 9;
        }
        else if (cardValue === 2) // these cards can be thrown on all but the joker
        {
            return true;
        }
        else if (cardValue === 9 || cardValue === 10)
        {
            return underlayingValue !== 14;
        }
        else if (cardValue === 8 || cardValue === 3)
        {
            return cardValue >= underlayingValue;
        }
        else if (takeStack.containingCards.length === 0 && underlayingCard === 14 && cardValue === 5)
        {
            return true;
        }
        else
        {
            return cardValue > underlayingValue;
        }
    };
}