# Jack's Pot Smart Contract

Jack’s Pot is a no-loss lottery game built on Wanchain.

To play the game, users stake one or more tickets with a four digit number on each ticket.

Users may either choose a specific four digit number through “Self Selection”, or they may generate multiple tickets with randomly four chosen four digit numbers using “Machine Selection”.

In order to stake a ticket, users must supply 10 WAN for each ticket. This WAN will be locked up in a Wanchain validator node during the duration of the game, and users may withdraw this WAN when they are finished playing.

The WAN used by staking tickets is delegated to Wanchain’s validator nodes, and the accrued consensus rewards are pooled into the Jackpot.

Every Friday a winning four digit number is selected at random using Wanchain’s true random number generation, and the reward will be awarded to any users who are currently staking a winning number. If multiple users have tickets staked with the winning number, the Jackpot will be split proportionally amongst all tickets with the winning number.

The lottery closes at 00:00 UTC on Friday, lottery results are settled at 23:00 UTC on Friday, and the lottery re-opens at 00:00 UTC on Saturday.

If there is no winner, the prize pot will automatically accumulate to the next cycle.

If you do not withdraw your tickets, those tickets will automatically participate in the next cycle with your chosen numbers.

# Code Compile

```
yarn
./node_modules/.bin/truffle compile
```

# Run Code Test

You should first start a rpc server at http://localhost:7545

Then run:

```
yarn test
```

# Run Code Coverage Analysis

```
yarn coverage
```

Then you can find a HTML-UI in coverage/index.html 

# Deploy

***Testnet*** 

Proxy: 0xd8b67e4c66a4ab51fa8b7a30a82c63ff792b79c0

Delegate: 0x8dd7e6a2b5c1e10bab4924a1d5899a6023b9ab9e

***Mainnet*** 






