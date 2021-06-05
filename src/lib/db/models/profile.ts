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

import { prop } from '@typegoose/typegoose';

export class Profile {
    @prop({ required: true, unique: true })
    public userId: string;

    @prop({ required: true, default: [], ref: () => Transaction })
    public transactions: Transaction[];

    @prop({ required: true, default: [], ref: () => Position })
    public positions: Position[];

    @prop({ required: true, default: 0 })
    public globalPL: number;

    @prop({ required: true, default: 0 })
    public costBasis: number;
}

export enum SecurityType {
    STOCK, OPTION
}

export class Position {
    @prop({ required: true })
    public name: string;

    @prop({ required: true })
    public ticker: string;

    @prop({ required: true, enum: SecurityType })
    public type: SecurityType;

    @prop({ required: true })
    public createdAt: Date;

    @prop({ required: true })
    public creationPrice: number;

    @prop({ required: true })
    public amount: number;
}

export enum TransactionType {
    BUY = 'BUY',
    SELL = 'SELL'
}

export class Transaction {
    @prop({ required: true })
    public ticker: string;

    @prop({ required: true, enum: SecurityType })
    public securityType: SecurityType;

    @prop({ required: true, enum: TransactionType })
    public type: TransactionType;
    
    @prop({ required: true })
    public createdAt: Date;
    
    @prop({ required: true })
    public creationPrice: number;
    
    @prop({ required: true })
    public amount: number;

    @prop({ required: true })
    public notional: number;
}