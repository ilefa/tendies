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

import { v4 as uuid } from 'uuid';
import { IvyEngine } from '@ilefa/ivy';

export abstract class Task {

    id: string;
    engine: IvyEngine;

    constructor(public interval: string, id?: string) {
        this.id = id || uuid();
    }

    /**
     * Called when the task scheduler executes
     * this task upon the given interval.
     */
    abstract run(): void;

    /**
     * Called when the task scheduler is shutting down
     * all tasks, can be used for saving user data or whatnot.
     */
    abstract exit(): void;

}