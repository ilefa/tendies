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

import { ProfileManager } from '../../profile';
import { Message, Permissions, User } from 'discord.js';
import { indicatorArrow, madeLost } from '../../../util';
import { SecurityType } from '../../../db/models/profile';

import {
    bold,
    capitalizeFirst,
    Command,
    CommandReturn,
    emboss,
    getChangeString,
    numberEnding,
    sum,
    toWords
} from '@ilefa/ivy';

export class MeCommand extends Command {

    constructor() {
        super('me', `Invalid usage: ${emboss('$me')}`, null, [], Permissions.FLAGS.SEND_MESSAGES, false);
    }

    async execute(user: User, message: Message, args: string[]): Promise<CommandReturn> {
        if (args.length !== 0)
            return CommandReturn.HELP_MENU;

        let manager = this.engine.moduleManager.require<ProfileManager>('Profile Manager');
        let prof = await manager.getProfile(user, true);
        if (!prof) {
            message.reply(this.embeds.build(user.username + '#' + user.discriminator + '\'s Profile', user.avatarURL(), `Something went wrong while loading your profile.`))
            return CommandReturn.EXIT;
        }

        let overview = await manager.getOverview(prof);
        let shares = sum(prof.positions.filter(ent => ent.type === SecurityType.STOCK), pos => pos.amount);
        let contracts = sum(prof.positions.filter(ent => ent.type === SecurityType.OPTION), pos => pos.amount);
        let topN = Math.min(5, overview.performance.length);

        message.reply(this.embeds.build(user.username + '#' + user.discriminator + '\'s Profile', user.avatarURL(), bold('At a glance') + `\n`
            + `The current balance of your portfolio is ${bold('$' + overview.balance.toLocaleString())},\n` 
            + `and you currently hold ${bold(shares.toLocaleString() + ` share${numberEnding(shares)}`)} + ${bold(contracts.toLocaleString() + ` contract${numberEnding(contracts)}`)}.\n\n` 
            + bold('The Numbers') + `\n` 
            + `${indicatorArrow(overview.dayPL)} You've ${madeLost(overview.dayPL)} ${bold(getChangeString(overview.dayPL.toLocaleString(), '$', 2, false))} today.\n` 
            + `${indicatorArrow(overview.profitLoss)} Overall, you've ${madeLost(overview.profitLoss)} ${bold(getChangeString(overview.profitLoss.toLocaleString(), '$', 2, false))}.\n` 
            + `:dollar: You've put ${bold('$' + overview.costBasis.toLocaleString())} into the market.\n\n`
            + bold(`Top${topN <= 1 ? '' : ' ' + capitalizeFirst(toWords(topN))} Securit${topN === 1 ? 'y' : 'ies'}`) + `\n` 
            + (overview.performance.length ? overview
                .performance
                .slice(0, topN)
                .map((ent, i) => `:${toWords(i + 1)}: ${bold(ent.security.meta.name + ` (${ent.security.meta.ticker})`)} ${madeLost(ent.dayChange, 'gained')} ${bold(getChangeString(ent.dayChange.toLocaleString(), '$', 2, false))}.`)
                .join('\n') : `You don't have any securities.`)));

        return CommandReturn.EXIT;
    }

}