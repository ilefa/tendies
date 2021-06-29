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

export class Snapshot {
    @prop({ required: true })
    public date!: Date;

    @prop({ required: true })
    public balance!: number;

    @prop({ required: true })
    public change!: number;
}

export class ProfileSnapshot {
    @prop({ required: true, unique: true })
    public userId: string;

    @prop({ required: true, type: Snapshot })
    public snapshots!: Snapshot[];
}