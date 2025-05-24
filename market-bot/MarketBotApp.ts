import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppAccessors, ILogger } from '@rocket.chat/apps-engine/definition/accessors';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { IConfigurationExtend, IEnvironmentRead } from '@rocket.chat/apps-engine/definition/accessors';
import { FinanceChatCommand } from './src/commands/FinanceChatCommand';
import { MarketUpdateCommand } from './src/commands/MarketUpdateCommand';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings';


export class MarketBotApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new FinanceChatCommand());
        await configuration.slashCommands.provideSlashCommand(new MarketUpdateCommand());

        // Register Alpha Vantage API Key
        await configuration.settings.provideSetting({
            id: 'alpha_vantage_api_key',
            type: SettingType.STRING,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'Alpha Vantage API Key',
            i18nDescription: 'API key for Alpha Vantage',
        });

        // Register Gemini API Key
        await configuration.settings.provideSetting({
            id: 'gemini_api_key',
            type: SettingType.STRING,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'Gemini API Key',
            i18nDescription: 'API key for Gemini AI',
        });
    }
}