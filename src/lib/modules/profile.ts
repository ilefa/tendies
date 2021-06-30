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

import { getOptions, quote } from '../repo';
import { User, UserResolvable } from 'discord.js';
import { OptionsContract, StonkQuote } from '../stonk';
import { Module, resolvableToId, sum } from '@ilefa/ivy';
import { BeAnObject, DocumentType } from '@typegoose/typegoose/lib/types';
import { getModelForClass, ReturnModelType as Model } from '@typegoose/typegoose';
import { Position, Profile, SecurityType, Transaction, TransactionType } from '../db/models/profile';

export type TransactionResponse = {
    success: boolean;
    error?: string | Error;
    details?: {
        lastPrice: number;
        amount: number;
        notional: number;
        security: StonkQuote | OptionsContract;
    }
}

export type CombinedPosition = {
    original: Position;
    combined: Position;
}

export type ManagedPosition = Position & {
    index: number;
}

export type PartialPosition = {
    position: Position;
    index: number;
    oldAmount: number;
    newAmount: number;
    delta: number;
}

export type PositionChanges = {
    full: ManagedPosition[];
    partial: PartialPosition[];
}

export type ClosedPositions = {
    full: ManagedPosition[];
    partial: PartialPosition[];
}

export type ProfileOverview = {
    balance: number;
    dayChange: number;
    dayPL: number;
    profitLoss: number;
    costBasis: number;
    performance: SecurityPerformance[];
}

export type SecurityPerformance = {
    security: {
        meta: Position;
        resolved: StonkQuote | OptionsContract;
    };
    dayChange: number;
    dayPL: number;
}

export type SecurityOverview = {
    name: string;
    ticker: string;
    marketValue: number;
    shareMarketValue: number;
    contractMarketValue: number;
    averageShareCost: number;
    averageContractCost: number;
    assets: Subpositions[];
}

export type Subpositions = {
    amount: number;
    type: SecurityType;
    gainLoss: number;
    creationPrice: number;
    createdAt: Date;
}

export type SellAmount = number | 'all';

export class ProfileManager extends Module {

    private model: Model<typeof Profile, BeAnObject>;

    constructor() {
        super('Profile Manager');
    }

    start = () => {
        this.model = getModelForClass(Profile);
        this.log('Profile Manager activated.');
    }; 

    end() {}

    /**
     * Attempts to retrieve a user's profile by providing
     * any type that can resolve the user's ID.
     * 
     * @param resolvable any type that can resolve to a user
     */
    getProfile = async (resolvable: UserResolvable, lean?: boolean): Promise<DocumentType<Profile>> => {
        let id = resolvableToId(resolvable);
        if (!id) return null;

        let exists = await this.model.exists({ userId: id });
        if (!exists) return await this.model.create({
            userId: id,
            transactions: [],
            positions: [],
            globalPL: 0,
            costBasis: 0,
        });

        return await this
            .model
            .findOne({ userId: id })
            .lean(lean);
    }

    /**
     * Attempts to create an overview for the provided
     * profile.
     * 
     * @param profile the profile to create an overview for
     */
    getOverview = async (profile: Profile): Promise<ProfileOverview> => {
        let resolvedPositions = await Promise.all(profile
            .positions
            .map(async pos => ({
                ...pos,
                resolved: await quote(pos.ticker, '1d', '30m')
            })));

        let balance = sum(resolvedPositions, pos => pos.resolved.meta.regularMarketPrice * pos.amount);
        let dayChange = sum(resolvedPositions, pos => pos.resolved.meta.regularMarketPrice - pos.resolved.meta.previousClose);
        let performance: SecurityPerformance[] = resolvedPositions
            .sort((a, b) => {
                let dB = b.resolved.meta.regularMarketPrice - b.resolved.meta.previousClose;
                let dA = a.resolved.meta.regularMarketPrice - a.resolved.meta.previousClose;
                return dB - dA;
            })
            .map(pos => ({
                security: {
                    meta: pos as Position,
                    resolved: pos.resolved,
                },
                dayChange: pos.resolved.meta.regularMarketPrice - pos.resolved.meta.previousClose,
                dayPL: pos.creationPrice - pos.resolved.meta.regularMarketPrice,
            }));

        let unrealizedPL = sum(resolvedPositions, pos => (pos.resolved.meta.regularMarketPrice - pos.creationPrice) * pos.amount);
        let unrealizedDayPL = sum(performance, pos => pos.dayPL * pos.security.meta.amount);

        return {
            balance,
            dayChange,
            dayPL: unrealizedDayPL,
            profitLoss: profile.globalPL + unrealizedPL,
            costBasis: profile.costBasis,
            performance
        };
    }

    /**
     * Attempts to create an overview for all positions
     * held by a given profile for a given ticker.
     * 
     * This will bundle together all shares/contracts
     * for a given ticker that are bought at differing
     * prices, and give a centralized way to compare
     * gain/loss per subposition.
     * 
     * @param profile the profile to create an overview for
     * @param ticker the ticker to get an overview for
     */
    createOverview = async (profile: Profile, ticker: string): Promise<SecurityOverview> => {
        let positions = await Promise.all(profile
            .positions
            .filter(pos => pos.ticker === ticker)
            .map(async pos => ({
                ...pos,
                resolved: await quote(pos.ticker, '1d', '30m')
            })));

        if (!positions || !positions.length) return null;
        let shares = positions.filter(pos => pos.type === SecurityType.STOCK);
        let contracts = positions.filter(pos => pos.type === SecurityType.OPTION);
        let shareValue = sum(shares, share => share.resolved.meta.regularMarketPrice * share.amount);
        let contractValue = 0; // for now

        return {
            ticker,
            name: positions[0].name,
            marketValue: shareValue + contractValue,
            shareMarketValue: shareValue,
            contractMarketValue: contractValue,
            averageShareCost: sum(shares, pos => pos.creationPrice) / (shares.length === 0 ? 1 : shares.length),
            averageContractCost: sum(contracts, pos => pos.creationPrice) / (contracts.length === 0 ? 1 : contracts.length),
            assets: positions.map(pos => ({
                amount: pos.amount,
                type: pos.type,
                gainLoss: pos.resolved.meta.regularMarketPrice - pos.creationPrice,
                creationPrice: pos.creationPrice,
                createdAt: pos.createdAt
            }))
        };
    }
    
    /**
     * Attempts to open some amount of positions of
     * a given security for a specified user.
     * 
     * @param user the user to open positions for
     * @param security the security to open positions with
     * @param amount the amount of positions to open for said security
     */
    buy = async (user: User, security: StonkQuote | OptionsContract, amount: number): Promise<TransactionResponse> => {
        let profile = await this.getProfile(user);
        let securityType = 'contractSymbol' in security
            ? SecurityType.OPTION
            : SecurityType.STOCK;

        let position = await this.createPosition(security, securityType, amount);
        if (!position) return {
            success: false,
            error: 'Error retrieving data from the web',
        }

        let combinable = this.combinePositions(profile, position);
        let transaction = this.createTransaction(position, position.creationPrice, TransactionType.BUY, amount);

        profile.transactions = [...profile.transactions, transaction];
        profile.positions = this.updateCombinedPosition(profile, combinable || position);
        profile.costBasis = profile.costBasis + transaction.notional;
        profile.save();

        return {
            success: true,
            details: {
                amount,
                lastPrice: position.creationPrice,
                notional: position.creationPrice * amount,
                security,
            }
        }
    }

    /**
     * Attempts to close positions of some kind for
     * a specified user.
     * 
     * @param user the user to close positions for
     * @param security the security to close positions for
     * @param amount the amount of positions to close
     */
    sell = async (user: User, security: StonkQuote | OptionsContract, amount: SellAmount): Promise<TransactionResponse> => {
        let profile = await this.getProfile(user);
        let securityType = 'contractSymbol' in security
            ? SecurityType.OPTION
            : SecurityType.STOCK;

        let lastPrice = securityType == SecurityType.STOCK
            ? (security as StonkQuote).meta.regularMarketPrice
            : (security as OptionsContract).lastPrice;

        let ticker = securityType == SecurityType.STOCK
            ? (security as StonkQuote).meta.symbol
            : (security as OptionsContract).contractSymbol;

        let positions: ManagedPosition[] = profile
            .positions
            .map((position, i) => ({
                name: position.name,
                ticker: position.ticker,
                type: position.type,
                createdAt: position.createdAt,
                creationPrice: position.creationPrice,
                amount: position.amount,
                index: i
            }));

        let managed: ManagedPosition[] = positions.filter(position => position.ticker === ticker);
        let totalHeld = sum(managed, ent => ent.amount);

        if (amount > totalHeld) return {
            success: false,
            error: `Insufficient ${securityType === SecurityType.STOCK ? 'shares' : 'contracts'} for this transaction`,
        }

        if (amount === 'all')
            amount = totalHeld;

        let positionChanges = this.positionsToClose(managed, amount);
        let modifiedPositions = this.updateModifiedPositions(positions, positionChanges);
        let transaction = this.createTransaction(managed[0], lastPrice, TransactionType.SELL, amount);
        
        let notional = (amount * lastPrice) * (securityType === SecurityType.STOCK ? 1 : 100);
        let basis = this.computeTransactionBasisDelta(positionChanges);
        let totalPL = notional - basis;

        profile.transactions = [...profile.transactions, transaction];
        profile.positions = modifiedPositions;
        profile.globalPL = this.setPrecision(profile.globalPL + totalPL);
        profile.costBasis = Math.max(0, this.setPrecision(profile.costBasis - basis));
        profile.save();

        return {
            success: true,
            details: {
                lastPrice,
                amount,
                notional,
                security
            }
        }
    }

    private computeTransactionBasisDelta = (changes: PositionChanges) => {
        let fullBasis = sum(changes.full, pos => pos.creationPrice);
        let partialBasis = 0;
        for (let partial of changes.partial) {
            for (let i = 0; i < partial.delta; i++) {
                partialBasis += partial.position.creationPrice;
            }
        }

        return fullBasis + partialBasis;
    }

    private combinePositions = (profile: Profile, position: Position): CombinedPosition => {
        // Ideally, there should only be one match with this system.
        let match = profile
            .positions
            .filter(existing => existing.ticker === position.ticker
                && existing.creationPrice === position.creationPrice)[0];

        if (!match) return null;
        match.amount += position.amount;

        return {
            original: position,
            combined: match
        };
    }

    private updateCombinedPosition = (profile: Profile, position: Position | CombinedPosition) => {
        if (position instanceof Position)
            return [...profile.positions, position];

        let index = profile
            .positions
            .findIndex(existing => existing.ticker === position.combined.ticker
                && existing.creationPrice === position.combined.creationPrice);
        
        if (index === -1) return [...profile.positions, position.combined];
        profile.positions[index] = position.combined;
        return profile.positions;
    }

    private positionsToClose = (positions: ManagedPosition[], amount: number): PositionChanges => {
        let full: ManagedPosition[] = [];
        let partial: PartialPosition[] = [];
        let sorted = positions.sort((a, b) => a.amount - b.amount);
        let closed = 0;

        for (let position of sorted) {
            if (closed >= amount)
                break;

            let count = position.amount;
            let originalAmount = position.amount;
            let overfilled = false;
            for (let i = 0; i < originalAmount; i++) {
                if (closed >= amount) {
                    overfilled = true;
                    partial.push({
                        position,
                        index: position.index,
                        newAmount: count,
                        oldAmount: originalAmount,
                        delta: originalAmount - count
                    });

                    break;
                }

                closed++;
                count--;
            }

            if (!overfilled) full.push(position);
        }

        return { full, partial }
    }

    private updateModifiedPositions = (all: ManagedPosition[], modified: ClosedPositions) => {
        let positions = [...all];
        for (let full of modified.full)
            positions = positions.filter(pos => pos.index !== full.index);

        for (let partial of modified.partial) {
            let match = positions.find(pos => pos.index === partial.index);
            if (!match) continue;
            match.amount = partial.newAmount;
        }

        return positions as Position[];
    }

    private createPosition = async (security: StonkQuote | OptionsContract, type: SecurityType, amount: number) => {
        let res = await getOptions(type === SecurityType.STOCK
            ? (security as StonkQuote).meta.symbol 
            : (security as OptionsContract).contractSymbol.split(/\d/)[0]);
            
        if (!res) return null;
        let position = new Position();
        let ticker = type == SecurityType.STOCK
            ? (security as StonkQuote).meta.symbol
            : (security as OptionsContract).contractSymbol;

        position.name = res.quote.displayName;
        position.ticker = ticker;
        position.type = type;
        position.createdAt = new Date();

        // We don't care about the price of the underlying for an option's creationPrice
        position.creationPrice = type === SecurityType.STOCK
            ? res.quote.regularMarketPrice
            : (security as OptionsContract).lastPrice;
        position.amount = amount;
        
        return position;
    }
        
    private createTransaction = (position: Position, lastPrice: number, type: TransactionType, amount: number) => {
        let transaction = new Transaction();
        let multiplier = position.type === SecurityType.STOCK ? 1 : 100;
        
        transaction.ticker = position.ticker;
        transaction.securityType = position.type;
        transaction.type = type;
        transaction.createdAt = new Date();
        transaction.amount = amount;
        transaction.creationPrice = lastPrice;
        transaction.notional = this.setPrecision((lastPrice * multiplier) * amount);

        return transaction;
    }

    private setPrecision = (int: number, digits = 2) => parseFloat(int.toFixed(digits));

}