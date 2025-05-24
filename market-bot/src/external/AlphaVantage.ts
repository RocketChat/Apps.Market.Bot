import { IHttp, IRead } from '@rocket.chat/apps-engine/definition/accessors';

export interface IMarketData {
    price?: number;
    symbol?: string;
    [key: string]: any;
}

export interface ITechnicalIndicators {
    sma50?: number;
    sma200?: number;
    rsi?: number;
    [key: string]: any;
}

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

export class AlphaVantageService {
    static async getMarketData(symbol: string, http: IHttp, read: IRead): Promise<IMarketData | undefined> {
        const apiKey = await read.getEnvironmentReader().getSettings().getValueById('alpha_vantage_api_key');
        const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        const response = await http.get(url);

        if (!response.data || !response.data['Global Quote']) {
            return undefined;
        }

        const quote = response.data['Global Quote'];
        return {
            price: parseFloat(quote['05. price']),
            symbol: quote['01. symbol'],
        };
    }

    static async getTechnicalIndicators(symbol: string, http: IHttp, read: IRead): Promise<ITechnicalIndicators | undefined> {
        const apiKey = await read.getEnvironmentReader().getSettings().getValueById('alpha_vantage_api_key');
        const sma50Url = `${ALPHA_VANTAGE_BASE_URL}?function=SMA&symbol=${symbol}&interval=daily&time_period=50&series_type=close&apikey=${apiKey}`;
        const sma200Url = `${ALPHA_VANTAGE_BASE_URL}?function=SMA&symbol=${symbol}&interval=daily&time_period=200&series_type=close&apikey=${apiKey}`;
        const rsiUrl = `${ALPHA_VANTAGE_BASE_URL}?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${apiKey}`;

        const [sma50Resp, sma200Resp, rsiResp] = await Promise.all([
            http.get(sma50Url),
            http.get(sma200Url),
            http.get(rsiUrl),
        ]);

        const getLastValue = (data: any, key: string) => {
            const series = data[key];
            if (!series) return undefined;
            const lastDate = Object.keys(series).sort().pop();
            return lastDate ? parseFloat(series[lastDate]['SMA'] || series[lastDate]['RSI']) : undefined;
        };

        return {
            sma50: getLastValue(sma50Resp.data, 'Technical Analysis: SMA'),
            sma200: getLastValue(sma200Resp.data, 'Technical Analysis: SMA'),
            rsi: getLastValue(rsiResp.data, 'Technical Analysis: RSI'),
        };
    }
}