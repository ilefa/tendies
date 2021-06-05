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

import axios from 'axios';

import { 
    DataGranularity,
    RangeGranularity,
    OptionsData,
    StonkQuote,
    FuturesQuote
} from './stonk';

/**
 * Attempts to retrieve a comprehensive quote for the given ticker.
 * 
 * @param ticker the ticker to quote
 * @param range the range of the results
 * @param interval the granularity of the results
 */
export const quote = async (ticker: string, range: string | RangeGranularity, interval: string | DataGranularity): Promise<StonkQuote> => await axios
    .get(`https://query2.finance.yahoo.com/v7/finance/chart/${ticker}?range=${range}&interval=${interval}&includeTimestamps=true&corsDomain=finance.yahoo.com`)
    .then(res => res.data.chart.result[0])
    .catch(_ => null);

/**
 * Attempts to retrieve options data for the given ticker.
 * @param ticker the ticker to lookup information for
 */
export const getOptions = async (ticker: string, expDate?: string | number): Promise<OptionsData> => await axios
    .get(`https://query2.finance.yahoo.com/v7/finance/options/${ticker + (expDate ? '?date=' + expDate : '')}`)
    .then(res => res.data.optionChain.result[0])
    .catch(_ => null);

/**
 * Attempts to retrieve options data for the given ticker.
 * @param ticker the ticker to lookup information for
 */
export const getExpirationDates = async (ticker: string): Promise<number[]> => {
    let data = await getOptions(ticker);
    if (!data) return null;
    return data.expirationDates;
}

/**
 * Attempts to retrieve futures informations for the given tickers.
 * @param tickers the list of tickers to lookup futures information for
 */
export const getFutures = async (tickers: string[]): Promise<FuturesQuote[]> => await axios
    .get(`https://quote.cnbc.com/quote-html-webservice/quote.htm?partnerId=2&requestMethod=quick&exthrs=1&noform=1&fund=1&output=json&symbols=${tickers.join('|')}`)
    .then(res => res.data)
    .then(data => data.QuickQuoteResult.QuickQuote)
    .catch(_ => null);