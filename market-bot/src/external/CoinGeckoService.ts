import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";

export interface ICoinGeckoMarketData {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    market_cap: number;
    price_change_percentage_24h: number;
    high_24h: number;
    low_24h: number;
    total_volume: number;
    circulating_supply: number;
    total_supply: number;
    ath: number;
    atl: number;
    [key: string]: any;
}

export interface IOHLCVData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export class CoinGeckoService {
    private static readonly BASE_URL = "https://api.coingecko.com/api/v3";

    static async getMarketData(
        coinId: string,
        http: IHttp
    ): Promise<ICoinGeckoMarketData | undefined> {
        const url = `${
            this.BASE_URL
        }/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}`;
        const response = await http.get(url);

        if (
            !response.data ||
            !Array.isArray(response.data) ||
            response.data.length === 0
        ) {
            return undefined;
        }

        return response.data[0] as ICoinGeckoMarketData;
    }

    static async searchCoins(
        query: string,
        http: IHttp
    ): Promise<Array<{ id: string; symbol: string; name: string }>> {
        const url = `${this.BASE_URL}/search?query=${encodeURIComponent(
            query
        )}`;
        const response = await http.get(url);

        if (!response.data || !response.data.coins) {
            return [];
        }

        return response.data.coins.map((coin: any) => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
        }));
    }

    static async getCoinGeckoOHLC(
        coinId: string,
        http: IHttp
    ): Promise<IOHLCVData[] | null> {
        try {
            const url =
                `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc` +
                `?vs_currency=usd&days=30`;

            const res = await http.get(url);

            if (!Array.isArray(res?.data)) return null;

            return res.data.map((candle: any[]) => ({
                time: candle[0], // ms
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: 0,
            }));
        } catch (err) {
            console.log("[COINGECKO-ERROR]", err);
            return null;
        }
    }
}
