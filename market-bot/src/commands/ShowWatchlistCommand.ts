import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    IRead,
    IModify,
    IHttp,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WatchlistService } from "../service/WatchlistService";
import { NotifierService } from "../service/NotifyUserService";
import { AlphaVantageService } from "../external/AlphaVantage";
import {
    CoinGeckoService,
    ICoinGeckoMarketData,
} from "../external/CoinGeckoService";
import { IMarketData } from "../external/MarketDataService";

export class ShowWatchlistCommand implements ISlashCommand {
    public command = "showwatchlist";
    public i18nDescription =
        "Display your current watchlist with current prices";
    public i18nParamsExample = "";
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp
    ): Promise<void> {
        const sender = context.getSender();
        const service = new WatchlistService();
        const list = await service.get(sender.id, read);

        if (list.length === 0) {
            return await NotifierService.notifyUser(
                modify,
                context,
                "Your watchlist is empty. Add items using `/addtowatchlist [TICKER]`."
            );
        }

        const lines: string[] = ["**Your Watchlist**:\n"];

        for (const ticker of list) {
            let price: number | string = "N/A";
            let changePercent: string = "N/A";

            try {
                const coins = await CoinGeckoService.searchCoins(ticker, http);
                const coin = coins.find(
                    (c) => c.symbol.toUpperCase() === ticker.toUpperCase()
                );

                if (coin && coin.id) {
                    const marketData: ICoinGeckoMarketData | undefined =
                        await CoinGeckoService.getMarketData(coin.id, http);

                    if (marketData) {
                        price = marketData.current_price.toFixed(2);
                        changePercent =
                            marketData.price_change_percentage_24h.toFixed(2) +
                            "%";
                        lines.push(
                            `- Crypto: ${ticker}: $${price} (24h: ${changePercent})`
                        );
                    }
                }
            } catch {
                // fallback to AlphaVantage
            }

            try {
                const marketData: IMarketData | null =
                    await AlphaVantageService.getMarketData(ticker, http, read);

                if (marketData && typeof marketData.price === "number") {
                    price = marketData.price.toFixed(2);

                    if (typeof marketData.changePercent === "string") {
                        changePercent = marketData.changePercent;
                    } else {
                        changePercent = "N/A";
                    }

                    lines.push(
                        `- Stock: ${ticker}: $${price} (Change: ${changePercent})`
                    );
                } else {
                    lines.push(`- ${ticker}: ❌ Price not found`);
                }
            } catch {
                lines.push(`- ${ticker}: ❌ Failed to fetch price`);
            }
        }

        await NotifierService.notifyUser(modify, context, lines.join("\n"));
    }
}
