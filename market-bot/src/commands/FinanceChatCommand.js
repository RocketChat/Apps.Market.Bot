"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceChatCommand = void 0;
const AlphaVantage_1 = require("../external/AlphaVantage");
const CoinGeckoService_1 = require("../external/CoinGeckoService");
const NewsService_1 = require("../external/NewsService");
const GeminiService_1 = require("../external/GeminiService");
class FinanceChatCommand {
    constructor() {
        this.command = 'financechat';
        this.i18nDescription = 'Finance & stock market chatbot';
        this.i18nParamsExample = '[stock_symbol or crypto_ticker] or [financial_query]';
        this.providesPreview = false;
    }
    async executor(context, read, modify, http, persistence) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        const logger = this.logger;
        try {
            const args = context.getArguments();
            if (!args || args.length === 0) {
                await this.notifyUser(modify, context, '⚠️ Please provide a stock or crypto ticker (e.g., AAPL, BTC) or a financial question.');
                return;
            }
            const query = args.join(' ').trim();
            if (!query.match(/^[\w\s\.\-\$]+$/)) {
                await this.notifyUser(modify, context, '⚠️ Invalid input. Please enter a valid ticker or question.');
                return;
            }
            const ticker = args[0].toUpperCase();
            let coins = [];
            try {
                coins = await CoinGeckoService_1.CoinGeckoService.searchCoins(ticker, http);
            }
            catch (err) {
                (_a = logger === null || logger === void 0 ? void 0 : logger.error) === null || _a === void 0 ? void 0 : _a.call(logger, `CoinGecko search error: ${err}`);
            }
            const coinMatch = coins.find(c => c.symbol.toUpperCase() === ticker);
            let prompt;
            let news = [];
            let responseText;
            if (coinMatch) {
                let coinData;
                try {
                    coinData = await CoinGeckoService_1.CoinGeckoService.getMarketData(coinMatch.id, http);
                }
                catch (err) {
                    (_b = logger === null || logger === void 0 ? void 0 : logger.error) === null || _b === void 0 ? void 0 : _b.call(logger, `CoinGecko market data error: ${err}`);
                }
                try {
                    news = await NewsService_1.NewsService.getLatestNews(http);
                }
                catch (err) {
                    (_c = logger === null || logger === void 0 ? void 0 : logger.error) === null || _c === void 0 ? void 0 : _c.call(logger, `NewsService error: ${err}`);
                }
                prompt = `
You are a financial expert providing insights on cryptocurrencies.

**User Query:** ${query}

💹 **Crypto Overview for ${(_d = coinData === null || coinData === void 0 ? void 0 : coinData.name) !== null && _d !== void 0 ? _d : ticker}:**
- 💰 *Current Price (USD):* ${(_e = coinData === null || coinData === void 0 ? void 0 : coinData.current_price) !== null && _e !== void 0 ? _e : "N/A"}
- 💹 *Market Cap:* ${(_f = coinData === null || coinData === void 0 ? void 0 : coinData.market_cap) !== null && _f !== void 0 ? _f : "N/A"}
- 📈 *24h Change (%):* ${(_g = coinData === null || coinData === void 0 ? void 0 : coinData.price_change_percentage_24h) !== null && _g !== void 0 ? _g : "N/A"}

📰 **Latest Financial News:**
${news.length > 0 ? news.map((n, index) => { var _a; return `${index + 1}. ${n.title} (${(_a = n.sentiment) !== null && _a !== void 0 ? _a : "N/A"})`; }).join("\n") : "No relevant news found."}

🔍 Provide an insightful response to the user's query based on this data.
                `;
            }
            else {
                let marketData = {};
                let indicators = {};
                try {
                    marketData = (_h = await AlphaVantage_1.AlphaVantageService.getMarketData(ticker, http, read)) !== null && _h !== void 0 ? _h : {};
                    indicators = (_j = await AlphaVantage_1.AlphaVantageService.getTechnicalIndicators(ticker, http, read)) !== null && _j !== void 0 ? _j : {};
                }
                catch (err) {
                    (_k = logger === null || logger === void 0 ? void 0 : logger.error) === null || _k === void 0 ? void 0 : _k.call(logger, `AlphaVantage error: ${err}`);
                }
                try {
                    news = await NewsService_1.NewsService.getLatestNews(http);
                }
                catch (err) {
                    (_l = logger === null || logger === void 0 ? void 0 : logger.error) === null || _l === void 0 ? void 0 : _l.call(logger, `NewsService error: ${err}`);
                }
                if (!marketData.price) {
                    await this.notifyUser(modify, context, `⚠️ Market data for *${ticker}* is unavailable. Please check the symbol.`);
                    return;
                }
                prompt = `
You are a financial expert providing insights on stock markets, technical indicators, and news sentiment analysis.

**User Query:** ${query}

📊 **Market Overview for ${ticker}:**
- 💰 *Current Price:* ${(_m = marketData.price) !== null && _m !== void 0 ? _m : "N/A"}
- 📈 *50-day Moving Avg:* ${(_o = indicators.sma50) !== null && _o !== void 0 ? _o : "N/A"}
- 📉 *200-day Moving Avg:* ${(_p = indicators.sma200) !== null && _p !== void 0 ? _p : "N/A"}
- 📊 *Relative Strength Index (RSI):* ${(_q = indicators.rsi) !== null && _q !== void 0 ? _q : "N/A"}

📰 **Latest Financial News:**
${news.length > 0 ? news.map((n, index) => { var _a; return `${index + 1}. ${n.title} (${(_a = n.sentiment) !== null && _a !== void 0 ? _a : "N/A"})`; }).join("\n") : "No relevant news found."}

🔍 Provide an insightful response to the user's query based on this data.
                `;
            }
            try {
                responseText = await (0, GeminiService_1.getGeminiChatResponse)(prompt, http, read);
            }
            catch (err) {
                (_r = logger === null || logger === void 0 ? void 0 : logger.error) === null || _r === void 0 ? void 0 : _r.call(logger, `GeminiService error: ${err}`);
                responseText = "⚠️ Sorry, I couldn't get a response from the AI service at this time.";
            }
            await this.notifyUser(modify, context, responseText);
        }
        catch (error) {
            (_s = logger === null || logger === void 0 ? void 0 : logger.error) === null || _s === void 0 ? void 0 : _s.call(logger, `Error in /financechat command: ${(_t = error === null || error === void 0 ? void 0 : error.message) !== null && _t !== void 0 ? _t : error}`);
            await this.notifyUser(modify, context, `⚠️ Error executing command: ${(_u = error === null || error === void 0 ? void 0 : error.message) !== null && _u !== void 0 ? _u : "Unknown error"}`);
        }
    }
    async notifyUser(modify, context, text) {
        await modify.getNotifier().notifyUser(context.getSender(), modify.getCreator().startMessage()
            .setText(text)
            .setRoom(context.getRoom())
            .getMessage());
    }
}
exports.FinanceChatCommand = FinanceChatCommand;
