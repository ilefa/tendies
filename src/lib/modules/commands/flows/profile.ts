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

import { Message } from 'discord.js';
import { TestCommand } from '@ilefa/ivy';
import { ProfileManager } from '../../profile';

export class ProfileFlow extends TestCommand {

    constructor() {
        super('profile');
    }

    async run(message?: Message) {
        let manager = this.engine.moduleManager.require<ProfileManager>('Profile Manager');
        if (!manager) return new Error('Profile Manager is not available.');

        let prof = await manager.getProfile(message.author);
        if (!prof) return new Error(`User ${message.author.id} does not have a profile.`);
        return prof;
    }

}