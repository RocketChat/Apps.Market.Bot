import { IHttp } from '@rocket.chat/apps-engine/definition/accessors';

export interface ICoinGeckoMarketData {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    market_cap: number;
    price_change_percentage_24h: number;
    [key: string]: any;
}

export class CoinGeckoService {
    private static readonly BASE_URL = 'https://api.coingecko.com/api/v3';

    static async getMarketData(coinId: string, http: IHttp): Promise<ICoinGeckoMarketData | undefined> {
        const url = `${this.BASE_URL}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}`;
        const response = await http.get(url);

        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            return undefined;
        }

        return response.data[0] as ICoinGeckoMarketData;
    }

    static async searchCoins(query: string, http: IHttp): Promise<Array<{ id: string; symbol: string; name: string }>> {
        const url = `${this.BASE_URL}/search?query=${encodeURIComponent(query)}`;
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
}