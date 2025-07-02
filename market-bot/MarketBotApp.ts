import { App } from "@rocket.chat/apps-engine/definition/App";
import {
    IAppAccessors,
    ILogger,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import {
    IConfigurationExtend,
    IEnvironmentRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { SettingType } from "@rocket.chat/apps-engine/definition/settings";
import { FinanceChatCommand } from "./src/commands/FinanceChatCommand";
import { AddToWatchlistCommand } from "./src/commands/AddToWatchlistCommand";
import { ShowWatchlistCommand } from "./src/commands/ShowWatchlistCommand";
import { RemoveFromWatchlistCommand } from "./src/commands/RemoveFromWatchlistCommand";
import { MarketUpdateCommand } from "./src/commands/MarketUpdateCommand";

export class MarketBotApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(
        configuration: IConfigurationExtend,
        environmentRead: IEnvironmentRead
    ): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(
            new FinanceChatCommand()
        );
        await configuration.slashCommands.provideSlashCommand(
            new MarketUpdateCommand()
        );
        await configuration.slashCommands.provideSlashCommand(
            new AddToWatchlistCommand()
        );
        await configuration.slashCommands.provideSlashCommand(
            new ShowWatchlistCommand()
        );
        await configuration.slashCommands.provideSlashCommand(
            new RemoveFromWatchlistCommand()
        );

        await configuration.settings.provideSetting({
            id: "alpha_vantage_api_key",
            type: SettingType.STRING,
            packageValue: "",
            required: true,
            public: false,
            i18nLabel: "Alpha Vantage API Key",
            i18nDescription: "API key for Alpha Vantage",
        });

        // Register Gemini API Key
        await configuration.settings.provideSetting({
            id: "gemini_api_key",
            type: SettingType.STRING,
            packageValue: "",
            required: true,
            public: false,
            i18nLabel: "Gemini API Key",
            i18nDescription: "API key for Gemini AI",
        });
    }
}
