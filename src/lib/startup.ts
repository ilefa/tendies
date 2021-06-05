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

import moment from 'moment';

import { Colors, IvyEngine, StartupRunnable } from '@ilefa/ivy';

const MESSAGE = `
     ______                   __                       
    /\\__  _\\                 /\\ \\  __                  
    \\/_/\\ \\/    __    ___    \\_\\ \\/\\_\\     __    ____  
       \\ \\ \\  /'__\`\\/' _ \`\\  /'_\` \\/\\ \\  /'__\`\\ /',__\\ 
        \\ \\ \\/\\  __//\\ \\/\\ \\/\\ \\L\\ \\ \\ \\/\\  __//\\__, \`\\
         \\ \\_\\ \\____\\ \\_\\ \\_\\ \\___,_\\ \\_\\ \\____\\/\\____/
          \\/_/\\/____/\\/_/\\/_/\\/__,_ /\\/_/\\/____/\\/___/                                                
`;

export class Watermark implements StartupRunnable {
    
    run = ({ logger }: IvyEngine) => {
        logger.unlisted(Colors.GREEN + MESSAGE + Colors.RESET);
        logger.unlisted(`              Booting ${logger.wrap(Colors.GREEN, 'Tendies')} version ${logger.wrap(Colors.DIM, '0.1 (master)')}`);
        logger.unlisted(`                      ILEFA Labs (c) ${moment().format('YYYY')}`);
        logger.unlisted(``);
    }

}