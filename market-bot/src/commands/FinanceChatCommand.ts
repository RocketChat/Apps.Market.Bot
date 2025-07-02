import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    IRead,
    IModify,
    IHttp,
    IPersistence,
    ILogger,
} from "@rocket.chat/apps-engine/definition/accessors";
import { MarketDataService, IMarketData } from "../external/MarketDataService";
import { NewsService, INewsArticle } from "../external/NewsService";
import { GeminiService } from "../external/GeminiService";
import { buildCryptoPrompt } from "../prompts/cryptoPrompt";
import { buildStockPrompt } from "../prompts/stockPrompt";
import { NotifierService } from "../service/NotifyUserService";

export class FinanceChatCommand implements ISlashCommand {
    public command = "financechat";
    public i18nDescription =
        "Get financial insights, stock and crypto data, and smart summaries.";
    public i18nParamsExample =
        "[stock_symbol or crypto_ticker] or [financial_query]";
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        const logger: ILogger | undefined = (this as any).logger;
        const llm = new GeminiService();
        try {
            const args: string[] = context.getArguments();
            if (!args || args.length === 0) {
                await NotifierService.notifyUser(
                    modify,
                    context,
                    "⚠️ Please provide a stock or crypto ticker (e.g., AAPL, BTC) or a financial question."
                );

                return;
            }

            const query: string = args.join(" ").trim();
            if (!query.match(/^[\w\s\.\-\$]+$/)) {
                await NotifierService.notifyUser(
                    modify,
                    context,
                    "⚠️ Invalid input. Please enter a valid ticker or question."
                );

                return;
            }

            const tickers = args.filter((arg) => /^[A-Za-z0-9]+$/.test(arg));
            const isMultiTicker =
                tickers.length === args.length && tickers.length > 1;

            const isSingleTicker = tickers.length === 1 && args.length === 1;

            let prompt: string;
            let news: INewsArticle[] = [];
            let responseText: string;

            if (isSingleTicker) {
                const ticker = tickers[0].toUpperCase();

                let marketData: IMarketData | null = null;

                try {
                    // Fetch both market data and technical indicators
                    marketData = await MarketDataService.getMarketData(
                        ticker,
                        http,
                        read,
                        true
                    );
                } catch (err) {
                    logger?.error?.(`MarketDataService error: ${err}`);
                }
                try {
                    news = await NewsService.getLatestNews(http);
                } catch (err) {
                    logger?.error?.(`NewsService error: ${err}`);
                }

                if (!marketData || !marketData.price) {
                    await NotifierService.notifyUser(
                        modify,
                        context,
                        `⚠️ Market data for *${ticker}* is unavailable. Please check the symbol.`
                    );
                    return;
                }

                if (marketData.isCrypto) {
                    prompt = buildCryptoPrompt(query, marketData as any, news);
                } else {
                    prompt = buildStockPrompt(
                        query,
                        ticker,
                        marketData,
                        marketData,
                        news
                    );
                }
            } else if (isMultiTicker) {
                prompt = `Provide a financial summary for the following tickers: ${tickers.join(
                    ", "
                )}.`;
            } else {
                prompt = query;
            }

            try {
                responseText = await llm.getChatResponse(prompt, http, read);
            } catch (err) {
                logger?.error?.(`LLMService error: ${err}`);
                responseText =
                    "⚠️ Sorry, I couldn't get a response from the AI service at this time.";
            }
            await NotifierService.notifyUser(modify, context, responseText);
        } catch (error: any) {
            logger?.error?.(
                `Error in /financechat command: ${error?.message ?? error}`
            );
            await NotifierService.notifyUser(
                modify,
                context,
                `⚠️ Error executing command: ${
                    error?.message ?? "Unknown error"
                }`
            );
        }
    }
}
