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
import { CommandManager, EventManager, IvyEngine } from '@ilefa/ivy';

export class CustomEventManager extends EventManager {

    constructor(engine: IvyEngine, commandCenter: CommandManager) {
        super(engine);
        this.commandCenter = commandCenter;
    }

    async start() {
        const { client } = this;
        
        client.on('message', async (message: Message) => {
            if (message.author.bot) {
                return;
            }
            
            try {
                // somehow provider is null and throws an exception
                let data = await this.engine.provider.load(message.guild);
                if (!message.content.startsWith(data.prefix)) {
                    return;
                }
            
                this.commandCenter.handle(message.author, message);    
            } catch (_e) {}
        })
    }
    
    private _exceptionHandler = async (err: any) => {
        if (err.message.includes('Unknown Message')) {
            return;
        }

        this.engine.logger.except(err, 'Tendies', `Encountered a uncaught exception`);
        this.engine.logger.severe('Tendies', err.stack);
    } 

    onException = (err: any) => this._exceptionHandler(err);
    onRejection = (err: any) => this._exceptionHandler(err);

}