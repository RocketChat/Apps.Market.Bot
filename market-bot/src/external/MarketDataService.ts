import { IHttp, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { AlphaVantageService } from './AlphaVantage';
import { CoinGeckoService } from './CoinGeckoService';

export interface IMarketData {
    price?: number;
    symbol?: string;
}

export class MarketDataService {
    public static async getMarketData(symbol: string, http: IHttp, read: IRead): Promise<IMarketData> {
        // Try CoinGecko first (for crypto)
        try {
            const coins = await CoinGeckoService.searchCoins(symbol, http);
            const coinMatch = coins.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
            if (coinMatch) {
                const coinData = await CoinGeckoService.getMarketData(coinMatch.id, http);
                if (coinData && coinData.current_price) {
                    return { price: coinData.current_price, symbol: coinData.symbol.toUpperCase() };
                }
            }
        } catch (e) {
            // Optionally log error
        }

        // Fallback to Alpha Vantage (for stocks/forex)
        try {
            const stockData = await AlphaVantageService.getMarketData(symbol, http, read);
            if (stockData && stockData.price) {
                return { price: stockData.price, symbol: stockData.symbol?.toUpperCase() || symbol.toUpperCase() };
            }
        } catch (e) {
            // Optionally log error
        }

        return {};
    }
}