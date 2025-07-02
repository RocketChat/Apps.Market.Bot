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
import { WatchlistService } from "../service/WatchlistService";
import { CoinGeckoService } from "../external/CoinGeckoService";
import { AlphaVantageService } from "../external/AlphaVantage";
import { IMarketData } from "../external/MarketDataService";
import { NotifierService } from "../service/NotifyUserService";
export class AddToWatchlistCommand implements ISlashCommand {
    public command = "addtowatchlist";
    public i18nDescription = "Add one or more tickers to your watchlist";
    public i18nParamsExample = "[TICKER1] [TICKER2] ...";
    public providesPreview = false;
    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        const args = context.getArguments();
        const sender = context.getSender();

        if (args.length === 0) {
            return await NotifierService.notifyUser(
                modify,
                context,
                "⚠️ Please provide at least one ticker."
            );
        }

        const tickers = args.map((t) => t.toUpperCase());
        const service = new WatchlistService();
        const existing = await service.get(sender.id, read);

        const added: string[] = [];
        const skipped: string[] = [];
        const invalid: string[] = [];

        for (const ticker of tickers) {
            if (existing.includes(ticker)) {
                skipped.push(ticker);
                continue;
            }

            const isValid = await this.isValidTicker(ticker, http, read);
            if (!isValid) {
                invalid.push(ticker);
                continue;
            }

            await service.add(sender.id, ticker, read, persistence);
            added.push(ticker);
        }

        let message = "";
        if (added.length) {
            message += `Added: ${added.join(", ")}\n`;
        }
        if (skipped.length) {
            message += `Already in watchlist: ${skipped.join(", ")}\n`;
        }
        if (invalid.length) {
            message += `Invalid tickers: ${invalid.join(", ")}\n`;
        }
        await NotifierService.notifyUser(modify, context, message.trim());
    }

    private async isValidTicker(
        ticker: string,
        http: IHttp,
        read: IRead
    ): Promise<boolean> {
        const logger: ILogger | undefined = (this as any).logger;
        try {
            const coins = await CoinGeckoService.searchCoins(ticker, http);
            const coinMatch = coins.find(
                (c) => c.symbol.toUpperCase() === ticker.toUpperCase()
            );
            if (coinMatch) {
                return true;
            }
        } catch (err) {
            logger?.error?.(`CoinGecko error: ${err}`);
        }

        let marketData: IMarketData = {};
        try {
            marketData =
                (await AlphaVantageService.getMarketData(ticker, http, read)) ??
                {};
            if (
                marketData &&
                typeof marketData.price === "number" &&
                !isNaN(marketData.price) &&
                marketData.price > 0 &&
                typeof marketData.symbol === "string" &&
                marketData.symbol.toUpperCase() === ticker.toUpperCase()
            ) {
                return true;
            }
        } catch (err) {
            logger?.error?.(`AlphaVantage error: ${err}`);
        }

        return false;
    }
}
