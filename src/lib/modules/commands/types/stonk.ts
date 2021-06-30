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

import shortenNumber from 'short-number';

import { getOptions, quote } from '../../../repo';
import { Message, Permissions, User } from 'discord.js';
import { ProfileManager, SecurityOverview } from '../../profile';
import { Profile, SecurityType } from '../../../db/models/profile';
import { OptionsStonkQuote, PriceList, StonkQuote } from '../../../stonk';

import {
    computeMACD,
    computeRSI,
    createPriceChart,
    getTotalVolume,
    indicatorArrow,
    madeLost
} from '../../../util';

import {
    bold,
    Command,
    CommandReturn,
    count,
    emboss,
    endLoader,
    getArrowEmoteForData,
    getChangeString,
    IvyEmbedIcons,
    startLoader,
    sum,
    time
} from '@ilefa/ivy';

export class StonkCommand extends Command {

    constructor() {
        super('stonk', `Invalid usage: ${emboss('$stonk <ticker>')}`, null, [], Permissions.FLAGS.SEND_MESSAGES, false);
    }

    async execute(user: User, message: Message, args: string[]): Promise<CommandReturn> {
        if (args.length !== 1)
            return CommandReturn.HELP_MENU;

        // options support later, since i will need to write a job to check for expiry
        let ticker = args[0];
        let loader = await startLoader(message);
        let stock = await quote(ticker, '1d', '1m');
        if (!stock) {
            endLoader(loader);
            message.reply(this.embeds.build('Stonks', IvyEmbedIcons.STONKS, `Can't find stock with ticker ${emboss(ticker)}.`, [], message));
            return CommandReturn.EXIT;
        }

        let manager = this.engine.moduleManager.require<ProfileManager>('Profile Manager');
        let prof = await manager.getProfile(user, true);
        let attached = true;
        if (!prof)
            attached = false;

        if (!stock.indicators.quote[0].close) {
            endLoader(loader);
            message.reply(this.embeds.build('Stonks', IvyEmbedIcons.STONKS, `Something went wrong while retrieving quotes for ${emboss(stock.meta.symbol)}.`));
            return CommandReturn.EXIT;
        }

        let opt = await getOptions(stock.meta.symbol);
        let data = opt ? opt.quote : stock;

        endLoader(loader);
        message.reply(await this.generateEmbed(data, stock, prof, message, manager));

        return CommandReturn.EXIT;
    }

    private generateEmbed = async (data: StonkQuote | OptionsStonkQuote, quote: StonkQuote, profile: Profile, message: Message, manager: ProfileManager) => {
        let volume = getTotalVolume(quote);
        let rsi = computeRSI(quote);
        let macd = computeMACD(quote);
        let prices: PriceList[] = [];
        let payload = quote.indicators.quote[0].close;

        payload.forEach((price, i) => {
            if (!price) {
                return;
            }

            let date = new Date(quote.timestamp[i] * 1000);
            date.setHours(date.getHours() - 4);
            prices.push({
                x: date,
                y: Number(price.toFixed(3))
            });
        });

        let chart = await createPriceChart(prices, prices[0].y)
            .setWidth(1250)
            .setHeight(800)
            .setBackgroundColor('rgba(0, 0, 0, 0)')
            .getShortUrl();
            
        if (!('sourceInterval' in data)) {
            let dayChange = data.meta.regularMarketPrice - data.meta.previousClose;
            let dayChangePct = (data.meta.regularMarketPrice / data.meta.previousClose * 100) - 100;
            return this.embeds.build(data.meta.symbol, IvyEmbedIcons.STONKS, `${bold('At a glance')}\n` 
                + `${bold(data.meta.symbol)} went ${madeLost(dayChange, 'up', 'down')} ${bold(getChangeString(dayChange, '$', 2) + ` (${getChangeString(dayChangePct, '', 2, true)}%)`)},\n` 
                + `and had a total volume of ${bold(volume.toLocaleString())} today.\n\n`
                + `${bold('Indicators')}\n`
                + `${getArrowEmoteForData(macd, 0, 0, 0)} ${bold('MACD:')} ${macd}\n` 
                + `${getArrowEmoteForData(rsi, 40, 40, 40)} ${bold('RSI:')} ${rsi}` 
                + this.generatePositionsMetadata(await this.getDataForProfile(profile, quote.meta.symbol, manager), quote.meta.regularMarketPrice), [], message, chart);
        }

        let dayChange = data.regularMarketPrice - data.regularMarketPreviousClose;
        let dayChangePct = (data.regularMarketPrice / data.regularMarketPreviousClose * 100) - 100;
        let volAvgRatio = ((volume / data.averageDailyVolume3Month) * 100) - 100;

        return this.embeds.build(`${data.displayName} (${data.symbol})`, IvyEmbedIcons.STONKS, `${bold('At a glance')}\n` 
            + `${bold(data.displayName)} went ${madeLost(dayChange, 'up', 'down')} ${bold(getChangeString(dayChange, '$', 2) + ` (${getChangeString(dayChangePct, '', 2, true)}%)`)} today.\n`
            + `Today's volume was ${bold(volume.toLocaleString())} which is ${madeLost(volAvgRatio, 'higher', 'lower')} than the average daily volume from the past three months ${bold(data.averageDailyVolume3Month.toLocaleString() + ' (' + getChangeString(volAvgRatio, '', 2, true) + '%)')}.\n\n`
            + `${bold('The Numbers')}\n` 
            + `:dollar: ${bold('Price:')} $${data.regularMarketPrice}\n` 
            + `:chart_with_upwards_trend: ${bold('Bid:')} $${data.bid}/${data.bidSize}\n`
            + `:chart_with_downwards_trend: ${bold('Ask:')} $${data.ask}/${data.askSize}\n`
            + `:office: ${bold('Market Cap:')} $${shortenNumber(data.marketCap)}\n` 
            + `:calendar: ${bold('Today\'s Range:')} $${data.regularMarketDayLow}-$${data.regularMarketDayHigh}\n` 
            + `:calendar_spiral: ${bold('52 Week Range:')} $${data.fiftyTwoWeekLow}-$${data.fiftyTwoWeekHigh}\n\n` 
            + `${bold('Indicators')}\n` 
            + `${getArrowEmoteForData(data.epsTrailingTwelveMonths?.toFixed(2), 0, 0, 0)} ${bold('EPS:')} $${data.epsTrailingTwelveMonths ? data.epsTrailingTwelveMonths.toFixed(2) : '0.00'}\n`
            + `${getArrowEmoteForData(macd, 0, 0, 0)} ${bold('MACD:')} ${macd}\n` 
            + `${getArrowEmoteForData(rsi, 40, 40, 40)} ${bold('RSI:')} ${rsi}`
            + this.generatePositionsMetadata(await this.getDataForProfile(profile, quote.meta.symbol, manager), quote.meta.regularMarketPrice), [], message, chart);
    }

    private getDataForProfile = async (profile: Profile, ticker: string, manager: ProfileManager) =>
        !profile
            ? null
            : await manager.createOverview(profile, ticker);

    private generatePositionsMetadata = (report: SecurityOverview, lastPrice: number) => {
        if (!report)
            return '';
        
        return `\n\n${bold('Your Stake')}\n` +
               `Your positions for this security are worth ${bold('$' + report.marketValue.toLocaleString())}.\n`
             + `:white_small_square: Average Cost: ${bold('$' + report.averageShareCost)}\n`
             + `:white_small_square: Positions Held: ${bold(count(report.assets, asset => asset.type === SecurityType.STOCK)).toLocaleLowerCase()}\n` 
             + `:white_small_square: Unrealized P/L: ${bold(getChangeString(sum(report.assets, asset => asset.gainLoss), '$', 2, true))}\n\n`
             + `${bold('Positions Breakdown')}\n`
             + report
                .assets
                .filter(asset => asset.type === SecurityType.STOCK)
                .sort((a, b) => a.creationPrice - b.creationPrice)
                .map(ent => {
                    let percentChange = (((lastPrice * ent.amount) / (ent.creationPrice * ent.amount)) * 100) - 100;
                    return `${indicatorArrow(ent.gainLoss)} ${bold(ent.amount + 'x')} at ${bold('$' + ent.creationPrice)}\n` 
                         + `:white_small_square: Asset P/L: ${bold(getChangeString(ent.gainLoss, '$', 2, true))} ${emboss(`(${getChangeString(percentChange, '', 2, true)}%)`)}\n` 
                         + `:white_small_square: Acquired: ${bold(time(ent.createdAt.getTime()))}`;
                })
                .join('\n');
    }

}