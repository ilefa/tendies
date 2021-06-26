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

import { getOptions } from '../repo';
import { User, UserResolvable } from 'discord.js';
import { Module, resolvableToId, sum } from '@ilefa/ivy';
import { OptionsContract, StonkQuote } from '../stonk';
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
    }
}

export type CombinedPosition = {
    original: Position;
    combined: Position;
}

export type PartialPosition = {
    position: Position;
    oldAmount: number;
    newAmount: number;
    delta: number;
}

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
    getProfile = async (resolvable: UserResolvable): Promise<DocumentType<Profile>> => {
        let id = resolvableToId(resolvable);
        if (!id) return null;

        let exists = await this.model.exists({ userId: id })
        if (!exists) return await this.model.create({
            userId: id,
            transactions: [],
            positions: [],
            globalPL: 0,
            costBasis: 0,
        });

        return await this.model.findOne({ userId: id });
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

        console.log('position', position);
        console.log('combinable', combinable);
        console.log('transaction', transaction);

        profile.updateOne({
            transactions: [...profile.transactions, transaction],
            positions: this.updateCombinedPosition(profile, combinable || position),
            costBasis: profile.costBasis + transaction.notional
        }, (err, raw) => {
            console.log(err, raw);
        });

        await profile.save();

        return {
            success: true,
            details: {
                amount,
                lastPrice: position.creationPrice,
                notional: position.creationPrice * amount
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
    sell = async (user: User, security: StonkQuote | OptionsContract, amount: number): Promise<TransactionResponse> => {
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

        let positions = profile.positions.filter(position => position.ticker === ticker);
        let totalHeld = sum(positions, ent => ent.amount);
        if (amount > totalHeld) return {
            success: false,
            error: `Insufficient ${securityType === SecurityType.STOCK ? 'shares' : 'contracts'} for this transaction`,
        }

        let notional = sum(positions, ent => ent.amount * lastPrice) * (securityType === SecurityType.STOCK ? 1 : 100);
        let basisChange = sum(positions, ent => ent.creationPrice * ent.amount);
        let totalPL = notional - basisChange;
        
        let positionChanges = this.positionsToClose(positions, amount);
        let transaction = this.createTransaction(positions[0], lastPrice, TransactionType.SELL, amount);
        let positionFilter = (position: Position) => positionChanges.fullClose.includes(position);

        profile.updateOne({
            positions: profile.positions.filter(positionFilter),
            transactions: [...profile.transactions, transaction],
            globalPL: profile.globalPL + totalPL,
            costBasis: Math.min(0, profile.costBasis - basisChange)
        });

        await profile.save();

        return {
            success: true,
            details: {
                lastPrice,
                amount,
                notional
            }
        }
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

        if (~index) return [...profile.positions, position];
        profile.positions[index] = position.combined;
        return profile.positions;
    }

    private positionsToClose = (positions: Position[], amount: number) => {
        let fullClose: Position[] = [];
        let partialClose: PartialPosition[] = [];
        let closed = 0;
        for (let position of positions) {
            if (closed > amount)
                break;

            let pre = position.amount;
            let overfill = false;
            for (let i = 0; i < position.amount; i++) {
                if (closed > amount) {
                    overfill = true;
                    partialClose.push({
                        position,
                        newAmount: position.amount,
                        oldAmount: pre,
                        delta: pre - position.amount
                    });
                    break;
                }

                closed++;
                position.amount--;
            }

            if (!overfill) fullClose.push(position);
        }

        return {
            fullClose,
            partialClose,
            closed
        }
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
        transaction.notional = (lastPrice * multiplier) * amount;

        return transaction;
    }

}