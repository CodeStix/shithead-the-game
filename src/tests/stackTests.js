class TestingCardStack 
{
    constructor()
    {
        this.containingCards = [];

        //for (let i = 0; i < 54; i++) 
        //    this.containingCards.push({cardType: Math.floor(i / 13), cardValue: (i % 13 + 1)});

        // cardType: 0 = klaver, 1 = hart, 2 = schop, 3 = ruit, 4 = joker, 5 = unknown
        // cardValue: 1 -> 13
        this.containingCards.push({cardType: 2, cardValue: 5});
        this.containingCards.push({cardType: 1, cardValue: 6});
        this.containingCards.push({cardType: 0, cardValue: 5});

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

    areTopCardsSameValue(depth = 4)
    {
        if (this.containingCards.length < depth)
            return false;

        return this.getSameValueDepthFromTop() >= depth;
    }
    
    getSameValueDepthFromTop()
    {
        if (this.isEmpty())
            return 0;

        const value = this.getTopCard().cardValue;
        for(let k = 1; k < this.containingCards.length; k++)
        {
            if (this.getTopCard(k).cardValue !== value)
                return k;
        }
        return this.containingCards.length;
    }
    
    countCardValues(value)
    {
        var i = 0;
        this.containingCards.forEach((card) => {
            if (card.cardValue === value)
                i++;   
        });
        return i;
    }

}

var stack = new TestingCardStack();

console.log(stack.countCardValues(3));


console.log("test");