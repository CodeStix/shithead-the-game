# Shithead: The Game

Play the game at [shithead.codestix.nl](http://shithead.codestix.nl/).

## Rules

The original rules can be found on [wikipedia](<https://en.wikipedia.org/wiki/Shithead_(card_game)>).

This version of the game altered some rules:

-   You can throw the 5 on the ace, but only when the draw stack is empty.
-   You can only throw odd cards on the **joker**. (there are games available without jokers)
-   You can throw an 8 on an 8, just like the 3. (you can disable this rule by calling the ShitHeadHandler constructor with false in server/views/shithead.twig)

## Running

-   `client/` contains browser javascript code. Use npm script **start** to watch and build the javascript files to the `server/public/` folder in realtime.
-   `server/src/` contains webserver and websocket server code.
