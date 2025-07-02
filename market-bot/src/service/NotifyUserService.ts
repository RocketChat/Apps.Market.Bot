import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { IModify } from "@rocket.chat/apps-engine/definition/accessors";

export class NotifierService {
    static async notifyUser(
        modify: IModify,
        context: SlashCommandContext,
        text: string
    ): Promise<void> {
        const sender = context.getSender();
        const room = context.getRoom();

        const messageBuilder = modify
            .getCreator()
            .startMessage()
            .setText(text)
            .setRoom(room)
            .setSender(sender);

        await modify
            .getNotifier()
            .notifyUser(sender, messageBuilder.getMessage());
    }
}
