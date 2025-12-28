import { IHttp, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { AlphaVantageService, ITechnicalIndicators } from './AlphaVantage';
import { CoinGeckoService, ICoinGeckoMarketData } from './CoinGeckoService';

export interface IMarketData {
    symbol?: string;
    name?: string;
    price?: number;

    open?: number;
    high?: number;
    low?: number;
    previousClose?: number;
    change?: number;
    changePercent?: string;
    volume?: number;
    sma50?: number;
    sma200?: number;
    rsi?: number;

    market_cap?: number;
    price_change_percentage_24h?: number;
    high_24h?: number;
    low_24h?: number;
    total_volume?: number;
    circulating_supply?: number;
    total_supply?: number;
    ath?: number;
    atl?: number;
    isCrypto?: boolean;
    sourceId?: string;
}

export class MarketDataService {
    public static async getMarketData(
        symbol: string,
        http: IHttp,
        read: IRead,
        withIndicators: boolean = false
    ): Promise<IMarketData | null> {
        try {
            const coins = await CoinGeckoService.searchCoins(symbol, http);
            const coinMatch = coins.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
            if (coinMatch) {
                const coinData = await CoinGeckoService.getMarketData(coinMatch.id, http);
                if (coinData && coinData.current_price) {
                    return {
                        symbol: coinData.symbol.toUpperCase(),
                        name: coinData.name,
                        price: coinData.current_price,
                        market_cap: coinData.market_cap,
                        price_change_percentage_24h: coinData.price_change_percentage_24h,
                        high_24h: coinData.high_24h,
                        low_24h: coinData.low_24h,
                        total_volume: coinData.total_volume,
                        circulating_supply: coinData.circulating_supply,
                        total_supply: coinData.total_supply,
                        ath: coinData.ath,
                        atl: coinData.atl,
                        isCrypto: true,
                        sourceId: coinMatch.id,
                    };
                }
            }
        } catch (e) {

        }

        try {
            const data = await AlphaVantageService.getMarketData(symbol, http, read);
            if (data && data.price) {
                let indicators: ITechnicalIndicators = {};
                if (withIndicators) {
                    indicators = await AlphaVantageService.getTechnicalIndicators(symbol, http, read) ?? {};
                }
                return {
                    symbol: data.symbol,
                    price: data.price,
                    open: data.open,
                    high: data.high,
                    low: data.low,
                    previousClose: data.previousClose,
                    change: data.change,
                    changePercent: data.changePercent,
                    volume: data.volume,
                    ...indicators,
                    isCrypto: false,
                };
            }
        } catch (e) {

        }

        return null;
    }
}