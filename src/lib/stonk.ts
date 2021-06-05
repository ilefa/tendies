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

export type StonkQuote = {
    meta: {
        symbol: string;
        exchangeName: string;
        instrumentType: string;
        currency: string;
        firstTradeDate: number | Date;
        regularMarketTime: number | Date;
        gmtoffset: number;
        timezone: string;
        exchangeTimezoneName: string;
        regularMarketPrice: number;
        chartPreviousClose: number;
        previousClose: number;
        scale: number;
        priceHint: number;
        currentTradingPeriod: {
            pre: TradingPeriod;
            regular: TradingPeriod;
            post: TradingPeriod;
        },
        tradingPeriods: [TradingPeriod[]];
        dataGranularity: RangeGranularity;
        range: RangeGranularity;
        validRanges: RangeGranularity;
    },
    timestamp: number[]; 
    indicators: {
        quote: [
            {
                open: number[];
                close: number[];
                low: number[];
                high: number[];
                volume: number[];
            }
        ]
    }
}

export type TradingPeriod = {
    timezone: string;
    start: number | Date;
    end: number | Date;
    gmtoffset: number;
}

export type PriceList = {
    x: Date;
    y: number;
}

export type DataGranularity = '1m' | '5m' | '10m' | '15m' | '30m' | '1h' | '2h' | '4h' | 'D' | 'W' | 'M' | 'Q' | 'Y'
export type RangeGranularity = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max'

export type OptionsData = {
    quote: OptionsStonkQuote;
    strikes: number[];
    expirationDates: number[];
    options: [{
        expirationDate: number;
        hasMiniOptions: boolean;
        calls: OptionsContract[];
        puts: OptionsContract[];
    }];
    underlyingSymbol: string;
}

export type OptionsContract = {
    contractSymbol: string;
    strike: number;
    currency: string;
    lastPrice: number;
    change: number;
    volume: number;
    percentChange: number;
    openInterest: number;
    bid: number;
    ask: number;
    contractSize: string;
    expiration: number;
    lastTradeDate: number | Date;
    impliedVolatility: number;
    inTheMoney: boolean;
}

export type OptionsStonkQuote = {
    language: string;
    region: string;
    quoteType: OptionsStonkQuoteType;
    quoteSourceName: string;
    triggerable: boolean;
    currency: string;
    tradeable: boolean;
    postMarketChangePercent: number;
    postMarketTime: number;
    postMarketPrice: number;
    regularMarketOpen: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketTime: number;
    regularMarketPrice: number;
    regularMarketDayHigh: number;
    regularMarketDayLow: number;
    regularMarketDayRange: string;
    regularMarketDayVolume: number;
    regularMarketPreviousClose: number;
    bid: number;
    ask: number;
    bidSize: number;
    askSize: number;
    marketCap: number;
    fullExchangeName: string;
    financialCurrency: string;
    averageDailyVolume3Month: number;
    averageDailyVolume10Day: number;
    fiftyTwoWeekLow: number;
    fiftyTwoWeekLowChange: number;
    fiftyTwoWeekLowChangePercent: number;
    fiftyTwoWeekRange: string;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekHighChange: number;
    fiftyTwoWeekHighChangePercent: number;
    earningsTimestamp: number;
    earningsTimestampStart: number;
    earningsTimestampEnd: number;
    forwardPE: number;
    trailingPE: number;
    epsTrailingTwelveMonths: number;
    epsForward: number;
    epsCurrentYear: number;
    priceEpsCurrentYear: number;
    sharesOutstanding: number;
    bookValue: number;
    priceToBook: number;
    fiftyDayAverage: number;
    fiftyDayAverageChange: number;
    fiftyDayAverageChangePercent: number;
    twoHundredDayAverage: number;
    twoHundredDayAverageChange: number;
    twoHundredDayAverageChangePercent: number;
    sourceInterval: number;
    exchangeDataDelayedBy: number;
    firstTradeDateMilliseconds: number;
    priceHint: number;
    marketState: string;
    exchange: string;
    shortName: string;
    longName: string;
    exchangeTimezoneName: string;
    exchangeTimezoneShortName: string;
    gmtOffSetMilliseconds: number;
    market: string;
    displayName: string;
    symbol: string;
}

export type OptionsStonkQuoteType = 'EQUITY';

export type FuturesQuote = {
    symbol: string;
    code: string;
    curmktstatus: string;
    FundamentalData: {
        yrlodate: string;
        yrloprice: string;
        yrhidate: string;
        yrhiprice: string;
    }
    mappedSymbol: {
        "xsi:nil": string;
    },
    source: string;
    cnbcId: string;
    high: string;
    low: string;
    provider: string;
    streamable: string;
    last_time: string;
    countryCode: string;
    previous_day_closing: string;
    altName: string;
    reg_last_time: Date;
    last_time_msec: string;
    altSymbol: string;
    change_pct: string;
    providerSymbol: string;
    assetSubType: string;
    comments: string;
    last: string;
    issue_id: string;
    cacheServed: boolean;
    responseTime: string;
    change: string;
    timeZone: string;
    onAirName: string;
    symbolType: string;
    assetType: string;
    volume: string;
    fullVolume: string;
    realTime: string;
    name: string;
    quoteDesc: any;
    exchange: string;
    shortName: string;
    cachedTime: string;
    currencyCode: string;
    open: string;
}