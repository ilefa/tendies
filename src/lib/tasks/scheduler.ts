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

import scheduler from 'node-schedule';

import { Task } from './task';
import { Job } from 'node-schedule';
import { conforms, Module } from '@ilefa/ivy';

export class TaskScheduler extends Module {

    private CRON_REGEX = /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/;

    registeredTasks: Task[];
    scheduledJobs: Map<string, Job>;

    constructor() {
        super('Task Scheduler', 'Scheduler');
        this.registeredTasks = [];
        this.scheduledJobs = new Map();
    }

    registerTask = <T extends Task>(task: T) => {
        let match = this.registeredTasks.find(ent => ent.id === task.id);
        if (match) return this.warn(`Failed to register task with ambigious ID [${task.id}]`);

        if (!conforms(this.CRON_REGEX, task.interval))
            return this.warn(`Failed to register task with ID ${task.id} since it has an invalid schedule: [${task.interval}]`);

        this.registeredTasks.push(task);
    }

    unregisterTask = (id: string) => {
        let match = this.registeredTasks.find(task => task.id === id);
        if (!match) return;

        let job = this.scheduledJobs.get(match.id);
        job.cancel();

        this.scheduledJobs.delete(match.id);
        this.registeredTasks = this.registeredTasks.filter(task => task.id !== id);
    }

    start = () => this
        .registeredTasks
        .forEach(task => this
            .scheduledJobs
            .set(task.id, scheduler.scheduleJob(task.interval, task.run)));

    end = () => this.registeredTasks.forEach(task => {
        let job = this.scheduledJobs.get(task.id);
        if (!job) return;

        job.cancel();
        task.exit();
        this.scheduledJobs.delete(task.id);
    });

}