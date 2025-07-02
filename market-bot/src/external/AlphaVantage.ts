import { IHttp, IRead } from "@rocket.chat/apps-engine/definition/accessors";
import { ALPHA_VANTAGE_API_KEY_SETTING_ID } from "./constants";

export interface AlphaVantageMarketData {
    symbol: string;
    open: number;
    high: number;
    low: number;
    price: number;
    volume: number;
    previousClose: number;
    change: number;
    changePercent: string;
}

export interface ITechnicalIndicators {
    sma50?: number;
    sma200?: number;
    rsi?: number;
}

// Helper function to fetch indicator values
async function fetchIndicatorValue(
    http: IHttp,
    url: string,
    analysisKey: string,
    valueKey: string
): Promise<number | undefined> {
    const response = await http.get(url);
    if (
        response.statusCode === 200 &&
        response.data &&
        response.data[analysisKey]
    ) {
        const values = Object.values(response.data[analysisKey]);
        if (values.length > 0 && (values[0] as any)[valueKey]) {
            return parseFloat((values[0] as any)[valueKey]);
        }
    }
    return undefined;
}

export class AlphaVantageService {
    public static async getMarketData(
        symbol: string,
        http: IHttp,
        read: IRead
    ): Promise<AlphaVantageMarketData | null> {
        const apiKey = await read
            .getEnvironmentReader()
            .getSettings()
            .getValueById(ALPHA_VANTAGE_API_KEY_SETTING_ID);
        if (!apiKey) {
            throw new Error(
                "Alpha Vantage API key is not set in app settings."
            );
        }

        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
            symbol
        )}&apikey=${apiKey}`;
        const response = await http.get(url);

        if (
            response.statusCode !== 200 ||
            !response.data ||
            !response.data["Global Quote"]
        ) {
            return null;
        }

        const quote = response.data["Global Quote"];
        return {
            symbol: quote["01. symbol"],
            open: parseFloat(quote["02. open"]),
            high: parseFloat(quote["03. high"]),
            low: parseFloat(quote["04. low"]),
            price: parseFloat(quote["05. price"]),
            volume: parseInt(quote["06. volume"], 10),
            previousClose: parseFloat(quote["08. previous close"]),
            change: parseFloat(quote["09. change"]),
            changePercent: quote["10. change percent"],
        };
    }

    public static async getTechnicalIndicators(
        symbol: string,
        http: IHttp,
        read: IRead
    ): Promise<ITechnicalIndicators | null> {
        const apiKey = await read
            .getEnvironmentReader()
            .getSettings()
            .getValueById(ALPHA_VANTAGE_API_KEY_SETTING_ID);
        if (!apiKey) {
            throw new Error(
                "Alpha Vantage API key is not set in app settings."
            );
        }

        // SMA 50
        const sma50Url = `https://www.alphavantage.co/query?function=SMA&symbol=${encodeURIComponent(
            symbol
        )}&interval=daily&time_period=50&series_type=close&apikey=${apiKey}`;
        const sma50 = await fetchIndicatorValue(
            http,
            sma50Url,
            "Technical Analysis: SMA",
            "SMA"
        );

        // SMA 200
        const sma200Url = `https://www.alphavantage.co/query?function=SMA&symbol=${encodeURIComponent(
            symbol
        )}&interval=daily&time_period=200&series_type=close&apikey=${apiKey}`;
        const sma200 = await fetchIndicatorValue(
            http,
            sma200Url,
            "Technical Analysis: SMA",
            "SMA"
        );

        // RSI
        const rsiUrl = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(
            symbol
        )}&interval=daily&time_period=14&series_type=close&apikey=${apiKey}`;
        const rsi = await fetchIndicatorValue(
            http,
            rsiUrl,
            "Technical Analysis: RSI",
            "RSI"
        );

        return { sma50, sma200, rsi };
    }
}
