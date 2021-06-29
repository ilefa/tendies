/*
 * Copyright (c) 2021 ILEFA Labs
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { User, Message } from 'discord.js';
import {
    Command,
    CommandReturn,
    CustomPermissions,
    emboss,
    IvyEmbedIcons
} from '@ilefa/ivy';

export class FlowCommand extends Command {

    constructor() {
        super('flow', `Invalid usage: ${emboss('$flow <name>')}`, null, [], CustomPermissions.SUPER_PERMS, false, false, [], [], true);
    }

    async execute(user: User, message: Message, args: string[]): Promise<CommandReturn> {
        if (args.length !== 1) {
            return CommandReturn.HELP_MENU;
        }

        let flow = this.manager.findFlow(args[0]);
        if (!flow) {
            message.reply(this.embeds.build('Test Flow Manager', IvyEmbedIcons.TEST, `Invalid flow: ${emboss(args[0])}.`, null, message));
            return CommandReturn.EXIT;
        }

        flow.command.execute(user, message, args);
        return CommandReturn.EXIT;
    }

}