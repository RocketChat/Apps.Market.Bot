import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IRead, IModify, IHttp, IPersistence, ILogger } from '@rocket.chat/apps-engine/definition/accessors';
import { AlphaVantageService, IMarketData, ITechnicalIndicators } from '../external/AlphaVantage';
import { CoinGeckoService, ICoinGeckoMarketData } from '../external/CoinGeckoService';
import { NewsService, INewsArticle } from '../external/NewsService';
import { getGeminiChatResponse } from '../external/GeminiService';

export class FinanceChatCommand implements ISlashCommand {
    public command = 'financechat';
    public i18nDescription = 'Finance & stock market chatbot';
    public i18nParamsExample = '[stock_symbol or crypto_ticker] or [financial_query]';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        const logger: ILogger | undefined = (this as any).logger; // If you inject logger in your App, pass it here

        try {
            const args: string[] = context.getArguments();
            if (!args || args.length === 0) {
                await this.notifyUser(
                    modify,
                    context,
                    '⚠️ Please provide a stock or crypto ticker (e.g., AAPL, BTC) or a financial question.'
                );
                return;
            }

            // Sanitize and validate input
            const query: string = args.join(' ').trim();
            if (!query.match(/^[\w\s\.\-\$]+$/)) {
                await this.notifyUser(
                    modify,
                    context,
                    '⚠️ Invalid input. Please enter a valid ticker or question.'
                );
                return;
            }

            const ticker: string = args[0].toUpperCase();

            // Try to classify as crypto using CoinGecko search
            let coins: Array<{ id: string; symbol: string; name: string }> = [];
            try {
                coins = await CoinGeckoService.searchCoins(ticker, http);
            } catch (err) {
                logger?.error?.(`CoinGecko search error: ${err}`);
            }
            const coinMatch = coins.find(c => c.symbol.toUpperCase() === ticker);

            let prompt: string;
            let news: INewsArticle[] = [];
            let responseText: string;

            if (coinMatch) {
                // Crypto via CoinGecko
                let coinData: ICoinGeckoMarketData | undefined;
                try {
                    coinData = await CoinGeckoService.getMarketData(coinMatch.id, http);
                } catch (err) {
                    logger?.error?.(`CoinGecko market data error: ${err}`);
                }
                try {
                    news = await NewsService.getLatestNews(http);
                } catch (err) {
                    logger?.error?.(`NewsService error: ${err}`);
                }

                prompt = `
You are a financial expert providing insights on cryptocurrencies.

**User Query:** ${query}

💹 **Crypto Overview for ${coinData?.name ?? ticker}:**
- 💰 *Current Price (USD):* ${coinData?.current_price ?? "N/A"}
- 💹 *Market Cap:* ${coinData?.market_cap ?? "N/A"}
- 📈 *24h Change (%):* ${coinData?.price_change_percentage_24h ?? "N/A"}

📰 **Latest Financial News:**
${news.length > 0 ? news.map((n, index) => `${index + 1}. ${n.title} (${n.sentiment ?? "N/A"})`).join("\n") : "No relevant news found."}

🔍 Provide an insightful response to the user's query based on this data.
                `;
            } else {
                // Stock via Alpha Vantage
                let marketData: IMarketData = {};
                let indicators: ITechnicalIndicators = {};
                try {
                    marketData = await AlphaVantageService.getMarketData(ticker, http, read) ?? {};
                    indicators = await AlphaVantageService.getTechnicalIndicators(ticker, http, read) ?? {};
                } catch (err) {
                    logger?.error?.(`AlphaVantage error: ${err}`);
                }
                try {
                    news = await NewsService.getLatestNews(http);
                } catch (err) {
                    logger?.error?.(`NewsService error: ${err}`);
                }

                if (!marketData.price) {
                    await this.notifyUser(
                        modify,
                        context,
                        `⚠️ Market data for *${ticker}* is unavailable. Please check the symbol.`
                    );
                    return;
                }

                prompt = `
You are a financial expert providing insights on stock markets, technical indicators, and news sentiment analysis.

**User Query:** ${query}

📊 **Market Overview for ${ticker}:**
- 💰 *Current Price:* ${marketData.price ?? "N/A"}
- 📈 *50-day Moving Avg:* ${indicators.sma50 ?? "N/A"}
- 📉 *200-day Moving Avg:* ${indicators.sma200 ?? "N/A"}
- 📊 *Relative Strength Index (RSI):* ${indicators.rsi ?? "N/A"}

📰 **Latest Financial News:**
${news.length > 0 ? news.map((n, index) => `${index + 1}. ${n.title} (${n.sentiment ?? "N/A"})`).join("\n") : "No relevant news found."}

🔍 Provide an insightful response to the user's query based on this data.
                `;
            }

            try {
                responseText = await getGeminiChatResponse(prompt, http, read);
            } catch (err) {
                logger?.error?.(`GeminiService error: ${err}`);
                responseText = "⚠️ Sorry, I couldn't get a response from the AI service at this time.";
            }

            await this.notifyUser(modify, context, responseText);

        } catch (error: any) {
            // Use Rocket.Chat logger if available
            logger?.error?.(`Error in /financechat command: ${error?.message ?? error}`);
            await this.notifyUser(
                modify,
                context,
                `⚠️ Error executing command: ${error?.message ?? "Unknown error"}`
            );
        }
    }

    // Helper to send a message to the user
    private async notifyUser(modify: IModify, context: SlashCommandContext, text: string): Promise<void> {
        await modify.getNotifier().notifyUser(
            context.getSender(),
            modify.getCreator().startMessage()
                .setText(text)
                .setRoom(context.getRoom())
                .getMessage()
        );
    }
}