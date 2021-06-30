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

import { quote } from '../../../repo';
import { ProfileManager, SellAmount } from '../../profile';
import { Message, Permissions, User } from 'discord.js';
import { bold, Command, CommandReturn, emboss, IvyEmbedIcons } from '@ilefa/ivy';

export class SellCommand extends Command {

    constructor() {
        super('sell', `Invalid usage: ${emboss('$sell <ticker> <amount | all>')}`, null, [], Permissions.FLAGS.SEND_MESSAGES, false);
    }

    async execute(user: User, message: Message, args: string[]): Promise<CommandReturn> {
        if (args.length !== 2)
            return CommandReturn.HELP_MENU;

        let amount = args[1].toLowerCase();
        if (!this.isValidAmount(amount)) {
            message.reply(this.embeds.build('Sell Securities', IvyEmbedIcons.STONKS, `Amount must be numeric or 'all': ${emboss(amount)}`, [], message));
            return CommandReturn.EXIT;
        }

        // options support later, since i will need to write a job to check for expiry
        let ticker = args[0];
        let stock = await quote(ticker, '1d', '1m');
        if (!stock) {
            message.reply(this.embeds.build('Sell Securities', IvyEmbedIcons.STONKS, `Can't find security with name ${emboss(ticker)}.`, [], message));
            return CommandReturn.EXIT;
        }

        let manager = this.engine.moduleManager.require<ProfileManager>('Profile Manager');
        let res = await manager.sell(user, stock, amount);
        if (res.error) {
            message.reply(this.embeds.build('Sell Securities', IvyEmbedIcons.STONKS, `Something went wrong while processing your request:\n` 
                + emboss(res.error instanceof Error ? res.error.message : res.error), [], message));
            return CommandReturn.EXIT;
        }

        message.reply(this.embeds.build('Transactions', user.avatarURL(), `Sold ${bold(res.details.amount + 'x')} shares of ${bold(stock.meta.symbol)}.`, [
            {
                name: 'Share Price',
                value: '$' + res.details.lastPrice.toLocaleString(),
                inline: true
            },
            {
                name: 'Notional',
                value: '$' + res.details.notional.toLocaleString(),
                inline: true
            }
        ], message));

        return CommandReturn.EXIT;
    }

    private isValidAmount = (arg: string | number): arg is SellAmount => {
        return arg === 'all' || !isNaN(parseInt(arg.toString()));
    }

}