import { NotifierService } from "../service/NotifyUserService";
import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    IRead,
    IModify,
    IHttp,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IMessageAttachment } from "@rocket.chat/apps-engine/definition/messages";
import { IOHLCVData, AlphaVantageService } from "../external/AlphaVantage";
import { CoinGeckoService } from "../external/CoinGeckoService";

export class GraphsCommand implements ISlashCommand {
    public command = "graphs";
    public i18nParamsExample = "[TICKER]";
    public i18nDescription = "Generates an OHLCV chart for stock or crypto.";
    public providesPreview = false;

    private static COINGECKO_MAP: Record<string, string> = {
        BTC: "bitcoin",
        ETH: "ethereum",
        SOL: "solana",
        BNB: "binancecoin",
        ADA: "cardano",
        XRP: "ripple",
        AVAX: "avalanche",
        DOT: "polkadot",
        MATIC: "polygon",
    };

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp
    ): Promise<void> {
        const [tickerRaw] = context.getArguments();
        const room = context.getRoom();
        const sender = context.getSender();

        if (!tickerRaw) {
            return NotifierService.notifyUser(
                modify,
                context,
                "⚠️ Usage: `/graphs <TICKER>` (examples: `/graphs AAPL`, `/graphs BTC`)"
            );
        }

        const ticker = tickerRaw.toUpperCase();
        let OHLCVData: IOHLCVData[] | null = null;
        let dataSource = "";

        const coinGeckoId = GraphsCommand.COINGECKO_MAP[ticker];
        if (coinGeckoId) {
            dataSource = "CoinGecko";
            console.log("[COINGECKO] Fetching OHLC for:", ticker);
            OHLCVData = await CoinGeckoService.getCoinGeckoOHLC(
                coinGeckoId,
                http
            );
        } else {
            dataSource = "AlphaVantage";
            console.log("[ALPHAVANTAGE] Fetching OHLC for:", ticker);
            OHLCVData = await AlphaVantageService.getOHLCVData(
                ticker,
                http,
                read
            );
        }

        if (!OHLCVData || OHLCVData.length === 0) {
            return NotifierService.notifyUser(
                modify,
                context,
                `❌ No OHLCV data available for *${ticker}*`
            );
        }

        const chartUrl = this.createChartUrl(OHLCVData, ticker);

        const attachment: IMessageAttachment = {
            title: { value: `${ticker} Chart` },
            imageUrl: chartUrl,
        };

        const chartMessage = modify
            .getCreator()
            .startMessage()
            .setSender(sender)
            .setRoom(room)
            .setText(`📈 OHLCV chart for *${ticker}*`)
            .addAttachment(attachment);

        await modify.getCreator().finish(chartMessage);
    }

    private createChartUrl(data: IOHLCVData[], ticker: string): string {
        const dataset = data.map((d) => ({
            // x: d.time,
            x: typeof d.time === "string" ? new Date(d.time).getTime() : d.time,
            o: d.open,
            h: d.high,
            l: d.low,
            c: d.close,
        }));

        const chartConfig = {
            type: "candlestick",
            data: {
                datasets: [
                    {
                        label: `${ticker} Price`,
                        data: dataset,
                        color: {
                            up: "#01d277",
                            down: "#ff4d5a",
                            unchanged: "#999",
                        },
                    },
                ],
            },
            options: {
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `${ticker} - Last ${dataset.length} intervals`,
                    },
                },
                scales: {
                    x: { type: "time", time: { unit: "day" } },
                    y: {
                        ticks: {
                            callback: (v: number) =>
                                Math.abs(v) >= 100
                                    ? v.toFixed(0)
                                    : v.toFixed(2),
                        },
                    },
                },
            },
        };

        return (
            "https://quickchart.io/chart?c=" +
            encodeURIComponent(JSON.stringify(chartConfig)) +
            "&width=900&height=500&backgroundColor=white&version=3"
        );
    }
}
