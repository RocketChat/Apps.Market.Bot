import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    IRead,
    IModify,
    IHttp,
    IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";
import { MarketDataService, IMarketData } from "../external/MarketDataService";
import { NotifierService } from "../service/NotifyUserService";
import { ChartService } from "../external/ChartService"
import { CoinGeckoService } from "../external/CoinGeckoService";
import { AlphaVantageService } from "../external/AlphaVantage";

// Define formatting functions separately
function formatCryptoMessage(marketData: IMarketData): string {
    return (
        `🪙 *${marketData.name}* (${marketData.symbol})\n` +
        `• Price: $${marketData.price}\n` +
        `• Market Cap: $${marketData.market_cap}\n` +
        `• 24h Change: ${marketData.price_change_percentage_24h}%\n` +
        `• 24h High: $${marketData.high_24h}\n` +
        `• 24h Low: $${marketData.low_24h}\n` +
        `• Volume: ${marketData.total_volume}\n` +
        `• Circulating Supply: ${marketData.circulating_supply}\n` +
        `• Total Supply: ${marketData.total_supply}\n` +
        `• All-Time High: $${marketData.ath}\n` +
        `• All-Time Low: $${marketData.atl}`
    );
}

function formatStockMessage(marketData: IMarketData): string {
    return (
        `📈 *${marketData.symbol}*\n` +
        `• Price: $${marketData.price}\n` +
        `• Open: $${marketData.open}\n` +
        `• High: $${marketData.high}\n` +
        `• Low: $${marketData.low}\n` +
        `• Previous Close: $${marketData.previousClose}\n` +
        `• Change: $${marketData.change} (${marketData.changePercent})\n` +
        `• Volume: ${marketData.volume}\n` +
        (marketData.sma50 ? `• 50-day SMA: $${marketData.sma50}\n` : "") +
        (marketData.sma200 ? `• 200-day SMA: $${marketData.sma200}\n` : "") +
        (marketData.rsi ? `• RSI: ${marketData.rsi}\n` : "")
    );
}

export class MarketUpdateCommand implements ISlashCommand {
    public command = "marketupdate";
    public i18nDescription =
        "Fetches real-time market updates for stocks and crypto";
    public i18nParamsExample = "[symbol]";
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        const [symbol] = context.getArguments();
        if (!symbol) {
            await NotifierService.notifyUser(
                modify,
                context,
                "Please provide a stock or crypto symbol."
            );
            return;
        }

        // 1. READ THE THEME SETTING
        const themeSetting = await read.getEnvironmentReader().getSettings().getValueById('chart_theme');
        const isDark = themeSetting !== 'light'; // Default to Dark if null/undefined

        // 1. Fetch Current Market Data
        const marketData = (await MarketDataService.getMarketData(
            symbol,
            http,
            read,
            true
        )) as IMarketData;

        if (!marketData || !marketData.price) {
            await NotifierService.notifyUser(modify, context, `⚠️ Market data for ${symbol} is not available.`);
            return;
        }

        let message: string;
        message = marketData.isCrypto
            ? formatCryptoMessage(marketData)
            : formatStockMessage(marketData);

        // 2. Fetch Historical Data for Chart
        let historyData: { date: string, price: number }[] = [];

        try {
            if (marketData.isCrypto && marketData.sourceId) {
                // Use the ID we saved earlier! No re-search needed.
                historyData = await CoinGeckoService.getHistoricalData(marketData.sourceId, 30, http);
            } else if (!marketData.isCrypto) {
                // Stocks use the symbol directly
                historyData = await AlphaVantageService.getHistoricalData(symbol, http, read);
            }
        } catch (e) {
            // If history fails, we just log it and show the text message. Don't crash.
            console.error("Failed to fetch history:", e);
        }

        // 3. Generate Chart URL
        let chartUrl = "";
        if (historyData.length > 0) {
            chartUrl = ChartService.getChartUrl(marketData.symbol || symbol, historyData, !!marketData.isCrypto, isDark);
        }

        // 4. Construct the Message with Attachment
        const sender = context.getSender();
        const room = context.getRoom();

        const messageBuilder = modify
            .getCreator()
            .startMessage()
            .setText(message)
            .setRoom(room)
            .setSender(sender);

        if (chartUrl) {
            messageBuilder.addAttachment({
                imageUrl: chartUrl,
                title: { value: "30-Day Price Trend" },
            });
        }

        await modify
            .getNotifier()
            .notifyUser(sender, messageBuilder.getMessage());
    }
}