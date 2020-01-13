function stackToString(stack)
{
    return stack.stackName + (stack.stackOwner === null ? "" : (":" + stack.stackOwner));
}

class GameScene extends Phaser.Scene 
{
    constructor(localPlayerName) {
        super({key: "GameScene"});
        this.localPlayer = {
            name: localPlayerName
        };
        this.players = [this.localPlayer];
        this.masterPlayerName = null;

        this.stacks = [];
        this.cards = [];
        this.commandHandlers = {};
        this.gameState = "waiting";
    }

    preload() {
        this.load.spritesheet("cards", "/img/cards.png", { frameWidth: 72, frameHeight: 96 });
        this.load.image("cardstack", "/img/cardstack.png");
    }

    create() {
        
        var statusText = this.add.text(0, 0, "connecting...");
        statusText.setFontSize(12);

        this.server = new WebSocket("ws://192.168.0.200:1987", "cards");
        var didConnect = false;
        this.server.onopen = () => {

            didConnect = true;
            statusText.text = "ok";
            this.server.send("setplayer " + this.localPlayer.name + "|join 0");
        };
        this.server.onmessage = (event) => {

            var commands = event.data.split("|");
            for(let i = 0; i < commands.length; i++)
            {
                var command = commands[i].trim();
                if (command.length === 0)
                    continue;
                var args = command.split(" ");

                switch(args[0])
                {
                    case "setmaster":
                        this.masterPlayerName = args[1];
                        console.log(`[CARDENGINE] ${this.masterPlayerName} is the master of the game!`);
                        continue;

                    case "playersalreadyjoined":
                        var playerNames = args[1].split(",");
                        playerNames.forEach((playerName) => {
                            var playerObject = {
                                name: playerName
                            };
                            this.players.unshift(playerObject);
                            this.onJoin(playerObject);
                        });
                        continue;

                    case "playerjoined":
                        var playerObject = {
                            name: args[1]
                        };
                        this.players.push(playerObject);
                        this.onJoin(playerObject);
                        continue;

                    case "playerleft":
                        var playerObject = this.players.splice(this.players.indexOf(args[1]), 1)[0];
                        this.onLeft(playerObject);
                        continue;

                    case "gamestate":
                        if (!this)
                        {
                            console.error("game should be set before gamestate!");
                            continue;
                        }
                        if (this.gameState !== args[1])
                        {
                            this.gameState = args[1];
                            this.resetStackMoveRules();
                            this.onGameStateChange(args[1]);
                        }
                        continue;

                    case "fillstack": // fillstack <stackname> <type1:value1[:visible1]...typeN:valueN[:visibleN]>
                        var deckStack = this.parseStack(args[1]);
                        var cardStrings = args[2].split(",");
                        cardStrings.map((str) => {
                            var s = str.split(":");
                            this.createCard(deckStack, parseInt(s[0]), parseInt(s[1]), s.length > 2);
                            //new DynamicCard(this, deckStack, parseInt(s[0]), parseInt(s[1]), s.length > 2);
                        });
                        //deckStack.updateCardPositions();
                        continue;

                    case "movecard": // movecard <cardIndex> <toStack> 
                        var cardToMove = this.getCard(parseInt(args[1]));
                        var stack = this.parseStack(args[2]);
                        stack.tryMoveCard(cardToMove, true);
                        stack.updateCardPositions();
                        continue;

                    case "deal":    // deal <dealAmount> <fromStackName> <toStackName1...toStackNameN>
                        var dealAmount = parseInt(args[1]);
                        var fromStack = this.parseStack(args[2]);
                        var toStacks = args[3].split(",").map((name) => this.parseStack(name));
                        this.dealCards(fromStack, toStacks, dealAmount);
                        break;

                    default:
                        if (!(this.onCommand(args)))
                            console.log("unkown command", command);
                        continue;
                }
            }
        };
        this.server.onerror = (err) => {

            statusText.text = "error: " + err;
        };
        this.server.onclose = (event) => {

            if (!didConnect)
                statusText.text = "could not connect";
            else if (event.wasClean) 
                statusText.text = `connection closed, code=${event.code} reason=${event.reason}`;
            else
                statusText.text = "connection died";
        };

        if (this.input.keyboard.on("keydown_A", () => {

            var takeStack = this.getStack("take");
            this.server.send("broadcastall deal " + takeStack.containingCards.length + " take throw");
           // this.getStack("burned").tryMoveAllCards(this.getStack("throw").containingCards);
        }));
        if (this.input.keyboard.on("keydown_S", () => {

            var throwStack = this.getStack("throw");
            this.server.send("broadcastall deal " + throwStack.containingCards.length + " throw burned");
        }));

    }

    /*getPlayerWithId(id)
    {
        var pl = this.players.find((pl) => pl.id === id);
        if (!pl)
            debugger;
        return pl;
    }*/

    getPlayerWithName(name)
    {
        var pl = this.players.find((pl) => pl.name === name);
        if (!pl)
            debugger;
        return pl;
    }

    dealCards(fromStack, toStacks, dealAmount = 1)
    {
        for (let j = 0; j < dealAmount; j++) 
        {
            for (let k = 0; k < toStacks.length && !fromStack.isEmpty(); k++) 
            {
                setTimeout(() => {
                    
                    var topCard = fromStack.getTopCard();
                    if (topCard === null)
                        return;
                    toStacks[k].tryToMoveCardOnTop(topCard, true);

                }, k * 100);
               
            }
        }
        return fromStack.containingCards.length > 0; // returns true if it still contains any card
    }

    registerCommand(command, func)
    {
        this.commandHandlers[command] = func;
    }

    unregisterCommand(command)
    {
        delete this.commandHandlers[command];
    }

    onCommand(args)
    {
        var func = this.commandHandlers[args[0]];
        func && func.bind(this)(args);
        return func != null;
    }

    onGameStateChange(newState)
    { }
    
    onJoin(player)
    { }

    onLeft(player)
    { }

    createCard(onDeck, cardType, cardValue, cardVisible)
    {
        var card = new DynamicCard(this, onDeck, cardType, cardValue, cardVisible);
        this.cards.push(card);
        return card;
    }

    createNormalStack(stackName, xPercent, yPercent, stackOwner = null)
    {
        return this.createStack(stackName, "stack", xPercent, yPercent, stackOwner);
    }

    createInventoryStack(stackName, xPercent, yPercent, stackOwner = null) 
    {
        return this.createStack(stackName, "inventory", xPercent, yPercent, stackOwner);
    }

    createVerticalInventoryStack(stackName, xPercent, yPercent, stackOwner = null) 
    {
        return this.createStack(stackName, "inventory_vertical", xPercent, yPercent, stackOwner);
    }

    createStack(stackName, stackType, xPercent, yPercent, stackOwner = null)
    {
        if (this.stacks.find((st) => st.name === stackName))
        {
            console.error("trying to create stack for the second time:", stackName);
            return null;
        }

        var maxWidth = this.game.config.width;
        var maxHeigth = this.game.config.height;
        var inventory = null;
        if (stackType === "stack")
            inventory = new CardStack(this, parseFloat(xPercent) * maxWidth, parseFloat(yPercent) * maxHeigth, stackName, stackOwner);
        else if (stackType === "inventory")
            inventory = new CardInventory(this, parseFloat(xPercent) * maxWidth, parseFloat(yPercent) * maxHeigth, stackName, stackOwner);
        else if (stackType === "inventory_vertical")
            inventory = new CardInventoryVertical(this, parseFloat(xPercent) * maxWidth, parseFloat(yPercent) * maxHeigth, stackName, stackOwner);
        else
        {
            console.error("unknown stack type", stackType);
            return null;
        }

        this.stacks.push(inventory);
        return inventory;
    }

    parseStack(str) 
    {
        var s = str.split(":");
        return this.getStack(s[0], s.length > 1 ? s[1] : null);
    }

    getStack(stackName, ownerOwner = null)
    {
        return this.stacks.find((st) => st.stackName === stackName && st.stackOwner === ownerOwner);
    }

    getCard(cardIndex)
    {
        return this.cards.find((cd) => cd.cardIndex === cardIndex);
    }

    resetStackMoveRules()
    {
        this.stacks.forEach((st) => st.resetRules());
    }

    isMaster(player)
    {
        return player.name === this.masterPlayerName;
    }
}

class Player
{
    constructor(scene, name)
    {
        this.name = name;

        var finalStackHeight = this.game.config.height - 200;
        this.finalPlayerStack1 = new CardStack(scene, scene.game.config.width * (1 / 4), finalStackHeight, `player_${name}_final1`);
        this.finalPlayerStack2 = new CardStack(scene, scene.game.config.width * (2 / 4), finalStackHeight, `player_${name}_final2`);
        this.finalPlayerStack3 = new CardStack(scene, scene.game.config.width * (3 / 4), finalStackHeight, `player_${name}_final3`);
    }
}

var currentCardDepth = 1;

const CLUBS = 0;
const HEARTS = 1;
const SPADES = 2;
const DIAMONDS = 3;
const JOKER = 4;

function getCardSpriteId(cardType, cardValue, cardVisible) 
{
    const BACK_SPRITE_ID = 27; // 13: red, 27: blue
    if (!cardVisible)
        return BACK_SPRITE_ID;
    else if (cardType == 0)
        return cardValue - 1;
    else if (cardType == 1)
        return cardValue + 27;
    else if (cardType == 2)
        return cardValue + 13;
    else if (cardType == 3)
        return cardValue + 41;
    else if (cardType == 4)
        return cardValue == 1 ? 41 : 55;
}

class CardStack extends Phaser.GameObjects.Sprite
{
    constructor(scene, x, y, stackName, stackOwner = null)
    {
        super(scene, x, y, "cardstack");

        this.stackOwner = stackOwner;
        this.stackName = stackName;
        this.containingCards = [];
        this.resetRules();

        scene.add.existing(this);
        this.setScale((game.config.width / this.width) / 4 * 0.85);
        this.setAngle(0);
    }

    resetRules()
    {
        this.onCardWantsToGoHere = (_newCard) => false;                   // default: a card can never be moved here, will return false for every card
        this.onCardDidGoHere = (_newCard) => {};
        this.onCardWantsToSwitchWithTop = (_newTopCard, _oldTopCard) => false; // default: a card can never be switched with the top card, will return false for every card
        this.onGetAllowedCardStacks = (_card) => [];                    // default: cannot go anywhere, no available stacks to move to are given
        this.onAddingCardToTop = (_cardBeingAdded) => {};
        this.onAddedCardToTop = (_cardAdded) => {};
        this.onSwitchingCardWithTop = (_newTopCard, _oldTopCard) => {};
        this.moveHereMode = "placeOnTop";
    }

    addCard(card) // ONLY THE CARD CLASS SHOULD CALL THIS
    {
        if (this.containingCards.includes(card))
        {
            console.warn("CardStack.addCard() was called, but the card to add was already in the stack, this should not happen!");
            return;
        }
        //console.log("add card to", this.stackName);

        this.containingCards.push(card);
        this.updateCardPositions();
    }

    removeCard(card) // ONLY THE CARD CLASS SHOULD CALL THIS
    {
        if (!this.containingCards.includes(card))
        {
            console.warn("CardStack.removeCard() was called, but the card to remove was not in the stack, this should not happen!");
            return;
        }
        //console.log("remove card from", this.stackName);

        this.containingCards.splice(this.containingCards.indexOf(card), 1);
        //this.updateCardPositions();
    }

    updateCardPositions()
    {
        this.containingCards.forEach((card) => {
            card.snapCardTo(this.x + Math.random() * 5, this.y + Math.random() * 5, "Cubic", this.angle + Math.random() * 24 - 12);
        });
    }

    tryToMoveCardOnTop(newCard, force = false) // card will be moved to this stack
    {
        if (force || this.onCardWantsToGoHere(newCard))
        {
            this.forceMoveCardOnTop(newCard);
            if (!force) 
                this.onCardDidGoHere(newCard); // only call this function if onCardWantsToGoHere was tested
            return true;
        }
        else
        {
            return false;
        }
    }

    forceMoveCardOnTop(newCard)
    {
        this.onAddingCardToTop(newCard);
        newCard.setDepth(currentCardDepth++); // render on top
        newCard.snappedToStack.removeCard(newCard);
        //newCard.snappedToStack.updateCardPositions(); // update old stack, the card is now removed
        newCard.snappedToStack = this; 
        this.addCard(newCard);
        //this.updateCardPositions();
        this.onAddedCardToTop(newCard);
    }

    tryToSwitchTopCard(newCard, force = false) // top card will be moved to old stack of card and card will be moved to this stack
    {
        if (this.containingCards.length === 0)
            return false;

        if (force || this.onCardWantsToSwitchWithTop(newCard,this.getTopCard()))
        {
            this.forceSwitchTopCard(newCard);
            return true;
        }
        else
        {
            return false;
        }
    }

    forceSwitchTopCard(newCard)
    {
        var oldTopCard = this.getTopCard();
        this.onSwitchingCardWithTop(newCard, oldTopCard);
        newCard.setDepth(currentCardDepth++);
        oldTopCard.setDepth(currentCardDepth++);
        this.removeCard(oldTopCard);
        newCard.snappedToStack.removeCard(newCard);
        newCard.snappedToStack.addCard(oldTopCard);
        this.addCard(newCard);
        oldTopCard.snappedToStack = newCard.snappedToStack;
        newCard.snappedToStack = this;
        //oldTopCard.snappedToStack.updateCardPositions();
        //this.updateCardPositions();
    }

    tryMoveCard(newCard, force = false)
    {
        switch(this.moveHereMode)
        {
            case "switchTop":
                return this.tryToSwitchTopCard(newCard, force);
            case "placeOnTop":
                return this.tryToMoveCardOnTop(newCard, force);
            default:
                throw new Error("Unkown stack move: " + this.moveHereMode);
        }
    }

    getTopCard(fromTop = 0)
    {
        if (this.isEmpty())
            return null;

        return this.containingCards[this.containingCards.length - fromTop - 1];
    }

    getBottomCard()
    {
        if (this.isEmpty())
            return null;

        return this.containingCards[0];
    }

    isEmpty()
    {
        return this.containingCards.length === 0;
    }

    tryMoveAllCards(newCards, force = false)
    {
        [...newCards].forEach((card) => this.tryMoveCard(card, force));
    }

    areTopCardsSameValue(depth = 4)
    {
        if (this.containingCards.length < 4)
            return false;

        const value = this.getTopCard().cardValue;
        for(let k = 1; k < depth; k++)
        {
            if (this.getTopCard(k).cardValue !== value)
                return false;
        }
        return true;
    }
}

class CardInventory extends CardStack
{
    constructor(scene, x, y, stackName, stackOwner = null)
    {
        super(scene, x, y, stackName, stackOwner);

        this.maxInventoryWidth = this.scene.game.config.width * 0.8;
        this.setAngle(0);
        this.visible = false;
    }

    updateCardPositions()
    {
        const xCardSplit = this.maxInventoryWidth / this.containingCards.length;
        var xOffset = -(this.containingCards.length - 1) / 2 * xCardSplit;
        var fan = -(this.containingCards.length - 1) / 2;
        this.containingCards.forEach(card => {
            card.snapCardTo(this.x + xOffset, this.y, "Back", this.angle + fan++);
            xOffset += xCardSplit;
            //card.flipCard(true);
        });
    }

    addCard(card)
    {
        super.addCard(card);

        // inventory card should always overlay
        this.containingCards.forEach((card) =>  card.setDepth(currentCardDepth++))
    }
}

class CardInventoryVertical extends CardStack
{
    constructor(scene, x, y, stackName, stackOwner = null)
    {
        super(scene, x, y, stackName, stackOwner);

        this.maxInventoryHeight = this.scene.game.config.height * 0.25;
        this.setAngle(90);
        this.visible = false;
    }

    updateCardPositions()
    {
        const yCardSplit = this.maxInventoryHeight / this.containingCards.length;
        var yOffset = -(this.containingCards.length - 1) / 2 * yCardSplit;
        var fan = -(this.containingCards.length - 1) / 2;
        this.containingCards.forEach(card => {
            card.snapCardTo(this.x, this.y + yOffset, "Back", this.angle + fan++);
            yOffset += yCardSplit;
            //card.flipCard(true);
        });
    }

    addCard(card)
    {
        super.addCard(card);

        // inventory card should always overlay
        this.containingCards.forEach((card) =>  card.setDepth(currentCardDepth++))
    }
}

var currentCardIndex = 1;

class DynamicCard extends Phaser.GameObjects.Sprite
{
    // cardType: 0 = klaver, 1 = hart, 2 = schop, 3 = ruit, 4 = joker, 5 = unknown
    // cardValue: 1 -> 13
    
    //new DynamicCard(this, deckStack, Math.floor(cardIndices[j] / 13), cardIndices[j] % 13 + 1, false);
    constructor(scene, stack, cardType, cardValue, cardVisible = false, draggable = true) 
    {
        super(scene, stack.x, stack.y, "cards", getCardSpriteId(cardType, cardValue, cardVisible)); 
        this.cardType = cardType;
        this.cardValue = cardValue;
        this.cardIndex = currentCardIndex++;
        this.cardVisible = cardVisible;

        scene.add.existing(this);
        this.setScale((game.config.width / this.width) / 4.75);
        this.setInteractive();
        this.setDepth(currentCardDepth++);
        
        //this.on("pointerdown", () => console.log("click card"));
        this.on("drag", (_pointer, dragX, dragY) => this.setPosition(dragX, dragY));
        this.on("dragstart", () => {

            if (this.snapToTween)
            {
                this.snapToTween.stop();
                this.snapToTween.remove();
            }
        });
        this.on("dragend", () => {

            const snapStacks = [this.snappedToStack, ...this.snappedToStack.onGetAllowedCardStacks(this)];

            if (!snapStacks || snapStacks.length === 0)
                return;

            var newSnapStack = null, minDistance = 100000000.0;
            for(let i = 0; i < snapStacks.length; i++)
            {
                const distance = Math.sqrt((this.x - snapStacks[i].x) * (this.x - snapStacks[i].x) + (this.y - snapStacks[i].y) * (this.y - snapStacks[i].y));
                if (distance < minDistance)
                {
                    newSnapStack = snapStacks[i];
                    minDistance = distance;
                }
            } 

            if (this.snappedToStack != newSnapStack)
            {
                if (newSnapStack.tryMoveCard(this))
                {
                    this.scene.server.send("broadcast movecard " + this.cardIndex + " " + stackToString(newSnapStack))
                    //console.log("switch ok ->", newSnapStack.stackName);
                }
                else
                {
                    console.log("switch not allowed by stack");
                }
            }
            else
            {
                console.log("no stack to switch too, going back");
            }

            this.snappedToStack.updateCardPositions();
        });

        this.snappedToStack = stack;
        this.snappedToStack.addCard(this);

        scene.input.setDraggable(this, draggable);
    }

    flipCard(cardVisible)
    {
        if (this.cardVisible == cardVisible) 
            return;

        if (this.flipTween)
        {
            this.flipTween.seek(1);
            this.flipTween.remove();
            clearTimeout(this.flipTweenTimeoutHandle);
        }

        const FLIP_TIME = 500;
        const FLIP_TEXTURE_FLIP_TIMEOUT = 125;
        this.flipTweenTimeoutHandle = setTimeout(() => {

            this.setFrame(getCardSpriteId(this.cardType, this.cardValue, this.cardVisible));

        }, FLIP_TIME / 2 - FLIP_TEXTURE_FLIP_TIMEOUT);

        this.scaleX = -this.scaleX;
        this.flipTween = this.scene.tweens.add({
            targets: this,
            scaleX: -this.scaleX,
            duration: FLIP_TIME,
            ease: "Cubic" //https://phaser.io/docs/2.6.2/Phaser.Easing.html
        });
        
        this.cardVisible = cardVisible;
    }

    snapCardTo(x, y, animation = "Cubic", rotation = 30)
    {
        if (this.x == x && this.y == y)
            return; // the card is already in the right spot

        if (this.snapToTween)
        {
            this.snapToTween.stop();
            this.snapToTween.remove();
        }

        this.snapToTween = this.scene.tweens.add({
            targets: this,
            x: x,
            y: y,
            angle: rotation,
            duration: 500,
            ease: animation //https://phaser.io/docs/2.6.2/Phaser.Easing.html
        });
    }
}