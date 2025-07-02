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
import { WatchlistService } from "../service/WatchlistService";
import { NotifierService } from "../service/NotifyUserService";
export class RemoveFromWatchlistCommand implements ISlashCommand {
    public command = "removefromwatchlist";
    public i18nDescription = "Remove one or more tickers from your watchlist";
    public i18nParamsExample = "[TICKER1] [TICKER2] ...";
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        const args = context.getArguments();
        const sender = context.getSender();

        if (args.length === 0) {
            return await NotifierService.notifyUser(
                modify,
                context,
                "⚠️ Please provide at least one ticker to remove."
            );
        }

        const tickersToRemove = args.map((t) => t.toUpperCase());
        const service = new WatchlistService();
        const current = await service.get(sender.id, read);

        const actuallyRemoved: string[] = [];
        const notFound: string[] = [];

        for (const ticker of tickersToRemove) {
            if (current.includes(ticker)) {
                await service.remove(sender.id, ticker, read, persistence);
                actuallyRemoved.push(ticker);
            } else {
                notFound.push(ticker);
            }
        }

        const lines: string[] = [];
        if (actuallyRemoved.length) {
            lines.push(`Removed: ${actuallyRemoved.join(", ")}`);
        }
        if (notFound.length) {
            lines.push(`⚠️ Not found in watchlist: ${notFound.join(", ")}`);
        }

        return await NotifierService.notifyUser(
            modify,
            context,
            lines.join("\n")
        );
    }
}
