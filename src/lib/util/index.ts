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

import ChartJsImage from 'chartjs-to-image';

import { PriceList, StonkQuote } from '../stonk';
import { getArrowEmoteForData } from '@ilefa/ivy';
import { DEMA, MACD, RSI } from 'trading-signals';

export const TRANSPARENT = '<:transparent:848092920979652648>';
export const TRIANGLE_GREEN_UP = '<:triangle_up:859218865023877162>';
export const TRIANGLE_RED_DOWN = ':small_red_triangle_down:';

export const indicatorArrow = (value: number) => {
    if (value >= 0) return TRIANGLE_GREEN_UP;
    if (value < 0) return TRIANGLE_RED_DOWN;
}

export const madeLost = (value: number, made?: string, lost?: string) => {
    if (value >= 0) return made || 'made';
    if (value < 0) return lost || 'lost';
}

/**
 * Retrieves the ranged-price variance
 * for a given stock result.
 * 
 * @param res the stock quote result
 */
 export const getPriceVariance = (res: StonkQuote) => {
    let payload = res.indicators.quote[0].close;
    return {
        lowest: Math.min(...payload),
        highest: Math.max(...payload)
    };
}

/**
 * Retrieves the total volume traded
 * in the ranged-stock quote result.
 * 
 * @param res the stock quote result
 */
export const getTotalVolume = (res: StonkQuote) => {
    let payload = res.indicators.quote[0].volume;
    return payload.reduce((a, b) => a + b, 0);
}

/**
 * Computes the MACD indicator value for the
 * given ranged-stock quote result.
 * 
 * @param res the stock quote result
 */
export const computeMACD = (res: StonkQuote) => {
    let payload = res.indicators.quote[0].close;
    const computation = new MACD({
        indicator: DEMA,
        longInterval: 12,
        shortInterval: 26,
        signalInterval: 9,
    });

    payload.forEach(price => {
        if (!price) {
            return;
        }

        computation.update(price);
    });

    return computation.getResult().macd.toFixed(2);
}

/**
 * Computes the RSI indicator value for the
 * given ranged-stock quote result.
 * 
 * @param res the stock quote result
 */
export const computeRSI = (res: StonkQuote) => {
    let payload = res.indicators.quote[0].close;
    const computation = new RSI(14);

    payload.forEach(price => {
        if (!price) {
            return;
        }

        computation.update(price);
    });

    return computation.getResult().toFixed(2);
}

export function createPriceChart(prices: PriceList[], open?: number): ChartJsImage {
    const chartColor = (open) && open > prices[prices.length - 1].y 
        ? 'rgba(231, 76, 60,1.0)' 
        : 'rgba(46, 204, 113,1.0)';

    const chart = new ChartJsImage();
    chart.setConfig({
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'stonks',
                    data: prices,
                    fill: false,
                    borderColor: chartColor
                },
                {
                    label: 'line',
                    data: [
                        {
                            x: prices[0].x,
                            y: open
                        },
                        {
                            x: prices[prices.length - 1].x,
                            y: open
                        }
                    ],
                    fill: false,
                    borderDash: [10, 5],
                    borderColor: 'rgba(255, 255, 255, 0.5)'
                }
            ]
        },
        options: {
            backgroundColor: 'transparent',
            legend: {
                display: false
            },
            elements: {
                point: {
                    radius: 0
                }
            },
            scales: {
                xAxes: [
                    {
                        type: 'time',
                        position: 'bottom',
                        distribution: 'series',
                        gridLines: {
                            display: true,
                            color: 'rgba(255, 255, 255, 0.35)'
                        }
                    }
                ],
                yAxes: [
                    {
                        gridLines: {
                            display: true,
                            color: 'rgba(255, 255, 255, 0.35)'
                        }
                    }
                ]
            }
        }
    });

    return chart;
}