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

import dotenv from 'dotenv';

import { Client } from 'discord.js';
import { Watermark } from './lib/startup';
import { DatabaseManager } from './lib/db';
import { TaskScheduler } from './lib/tasks';
import { IvyEngine, Logger } from '@ilefa/ivy';
import { CustomEventManager, ProfileManager } from './lib/modules';

import {
    ClearProfileFlow,
    BuyCommand,
    FlowCommand,
    MeCommand,
    ProfileFlow,
    SellCommand
} from './lib/modules/commands';

dotenv.config();

/**
 * Todo Items:
 * - Utilize Ivy's stash to cache quotes to avoid ratelimiting
 * - Implement all stonks commands from rkt
 * - Implement a leaderboard for highest globalPL
 * - Implement a scheduler to exercise/cash out options on expiry date (maybe a pref the user can set)
 *   - Before exercising is even considered, I need to figure out exactly how it works so its implemented correctly
 * - Implement account balance tracking per-day so we can have some fancy graphs down the line
 * - Get all days market is closed and prevent people from trading then (or grab market status from some API)
 * - Divident reinvestment / dividend tracking / dividend calculation
 */
export default class Tendies extends IvyEngine {
    
    profileManager: ProfileManager;
    taskScheduler: TaskScheduler;

    constructor() {
        super({
            token: process.env.DISCORD_TOKEN,
            name: 'Tendies',
            logger: new Logger(),
            gitRepo: 'ilefa/tendies',
            superPerms: [
                '177167251986841600',
                '268044207854190604',
                '224566699448336384',
                '248149168323821569'
            ],
            reportErrors: [
                '785050947407052821',
                '814644813257113672',
                '613783446464102612'
            ],
            color: 0x8BC34A,
            prefix: '$',
            startup: new Watermark(),
            presence: {
                status: 'online',
                activity: {
                    name: 'stonks fly.',
                    type: 'WATCHING',
                }
            }
        });
    }

    onReady(_client: Client) {
        this.registerEventHandler(new CustomEventManager(this, this.commandManager))
    }

    registerCommands() {
        this.registerCommand(new BuyCommand());
        this.registerCommand(new FlowCommand());
        this.registerCommand(new MeCommand());
        this.registerCommand(new SellCommand());
    }

    registerModules() {
        let scheduler = new TaskScheduler();
        // scheduler.registerTask();

        this.registerModule(new DatabaseManager());
        this.registerModule(this.profileManager = new ProfileManager());
        this.registerModule(this.taskScheduler = scheduler);
    }

    registerFlows() {
        this.registerFlow(new ClearProfileFlow());
        this.registerFlow(new ProfileFlow());
    }

}

new Tendies();