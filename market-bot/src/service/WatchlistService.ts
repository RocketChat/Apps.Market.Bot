import {
    IRead,
    IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";

import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";

export class WatchlistService {
    private getAssoc(userId: string): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(
            RocketChatAssociationModel.USER,
            `watchlist:${userId}`
        );
    }

    async get(userId: string, read: IRead): Promise<string[]> {
        const assoc = this.getAssoc(userId);
        const data = await read.getPersistenceReader().readByAssociation(assoc);

        if (
            Array.isArray(data) &&
            data.length > 0 &&
            typeof data[0] === "object" &&
            "tickers" in data[0]
        ) {
            return (data[0] as { tickers: string[] }).tickers;
        }

        return [];
    }

    async add(
        userId: string,
        ticker: string,
        read: IRead,
        persistence: IPersistence
    ) {
        const current = await this.get(userId, read);
        if (!current.includes(ticker)) {
            const updated = [...current, ticker];
            await persistence.updateByAssociation(
                this.getAssoc(userId),
                { tickers: updated },
                true
            );
        }
    }

    async remove(
        userId: string,
        ticker: string,
        read: IRead,
        persistence: IPersistence
    ) {
        const current = await this.get(userId, read);
        const updated = current.filter((t) => t !== ticker);
        await persistence.updateByAssociation(
            this.getAssoc(userId),
            { tickers: updated },
            true
        );
    }
}
