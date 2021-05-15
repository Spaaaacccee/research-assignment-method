<img src="./train.png" style="border: 1px solid #E1E4E8;"/>

# Train

This page trains an evolutionary neural network to make decisions as an investor with stock prices from 50 of the top ASX companies (those with names starting with the first half of the alphabet) from 5th of May 2021 to 13th of May 2021, along with up to 100 Twitter posts for each.

[See the dataset](https://raw.githubusercontent.com/Spaaaacccee/research-assignment-method-data/master/dataset.json)

## Simulation Format

Investors are granted vision (shown by the edges of graph) as well as memory. A green node indicates they have decided to buy, and a red node indicates they have decided to sell. The size of the node indicates their current wealth. All investors can see the current stock price.

Investors also make posts, with their sentiment indicated by a happy/sad emoji. Each investor also has a visibility attribute, which is a measure of their influence. A higher visibility indicates a higher chance its node will be connected to other nodes.

Each trial involves one company and 30 investors. Over four days, investors will be allowed to buy, hold, or sell stocks. The value of the stock at the end of particular day will be determined by the net decision made by the population. A trial is considered successful if it correctly predicts whether the stock increases or decreases in value (no attempts to judge magnitude).

## Neural Network Format

By default, each model will be tested against 10 randomly chosen datasets over three days. The fitness of a model is judged by how many trials are successful. Every generation consists of 50 genomes, the top 10% are crossed over and mutated to form the next generation.

The input to a model is the investor's vision encoded into an array of 42 floating-point numbers that range from 0 to 1. The space is used as follows:

- Investor's current wealth
- Investor's current investments
- The change in company's value over the last 10 days (10 spaces)
- Favourite count, retweet count, and text sentiment of the 10 most recent visible posts (3 spaces each, total of 30 spaces)

The model outputs a number ranging from 0 to 1, with a value below 0.5 indicating sell and above 0.5 indicating buy.
