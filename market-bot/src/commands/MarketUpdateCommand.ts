import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IRead, IModify, IHttp, IPersistence } from '@rocket.chat/apps-engine/definition/accessors';
import { MarketDataService } from '../external/MarketDataService';

export class MarketUpdateCommand implements ISlashCommand {
    public command = 'marketupdate';
    public i18nDescription = 'Fetches real-time market updates for stocks and crypto';
    public i18nParamsExample = '[symbol]';
    public providesPreview = false;

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify,
        http: IHttp, persistence: IPersistence): Promise<void> {
        const [symbol] = context.getArguments();
        if (!symbol) {
            await modify.getNotifier().notifyUser(
                context.getSender(),
                modify.getCreator().startMessage()
                    .setText('Please provide a stock or crypto symbol.')
                    .setRoom(context.getRoom())
                    .getMessage()
            );
            return;
        }

        const marketData = await MarketDataService.getMarketData(symbol, http, read);
        const priceText = marketData && marketData.price
            ? `📈 Current price of ${marketData.symbol || symbol}: $${marketData.price}`
            : `⚠️ Market data for ${symbol} is not available.`;

        await modify.getNotifier().notifyUser(
            context.getSender(),
            modify.getCreator().startMessage()
                .setText(priceText)
                .setRoom(context.getRoom())
                .getMessage()
        );
    }
}