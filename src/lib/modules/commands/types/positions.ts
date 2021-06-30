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

import { indicatorArrow } from '../../../util';
import { ProfileManager, SecurityOverview } from '../../profile';
import { Message, Permissions, TextChannel, User } from 'discord.js';

import {
    bold,
    Command,
    CommandReturn,
    emboss,
    getChangeString,
    IvyEmbedIcons,
    link,
    PageContent,
    PaginatedEmbed,
    sum
} from '@ilefa/ivy';

export class PositionsCommand extends Command {

    constructor() {
        super('positions', `Invalid usage: ${emboss('$positions')}`, null, [], Permissions.FLAGS.SEND_MESSAGES, false);
    }

    async execute(user: User, message: Message, args: string[]): Promise<CommandReturn> {
        if (args.length !== 0)
            return CommandReturn.HELP_MENU;

        let manager = this.engine.moduleManager.require<ProfileManager>('Profile Manager');
        let prof = await manager.getProfile(user, true);
        if (!prof) {
            message.reply(this.embeds.build('Positions', IvyEmbedIcons.STONKS, `Something went wrong while retrieving your profile.`));
            return CommandReturn.EXIT;
        }

        let data = await Promise
            .all(prof
                .positions
                .map(async ({ ticker }) => await manager.createOverview(prof, ticker)));

        data = data
            .filter(a => !!a)
            .sort((a, b) => a.name.localeCompare(b.name));

        let transform = (pageContent: SecurityOverview[]): PageContent => {
            return {
                description: pageContent
                    .map(ent => {
                        let total = sum(ent.assets, asset => asset.amount);
                        let totalGL = sum(ent.assets, asset => asset.gainLoss);
                        return `${indicatorArrow(totalGL)} ${link(`[${ent.ticker}]`, `https://www.tradingview.com/symbols/${ent.ticker}/`)} ${bold(`${total}x`)} at ${bold('$' + ent.averageShareCost.toLocaleString())} ${emboss(`(${getChangeString(totalGL, '', 1, true)}%)`)}`;
                    })
                    .join('\n'),
                fields: []
            }
        }

        PaginatedEmbed.ofItems<SecurityOverview>(this.engine, message.channel as TextChannel,
            user, `${user.username}#${user.discriminator}'s Positions`, user.avatarURL(),
            data, 6, transform);

        return CommandReturn.EXIT;
    }

}