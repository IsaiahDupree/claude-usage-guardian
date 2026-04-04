#!/usr/bin/env node
/**
 * CLI: Check Claude usage and exit with status code.
 * Exit codes: 0 = continue, 1 = pause, 2 = stop
 */
import { guard } from '../index.js';

const pauseAt = parseInt(process.env.USAGE_PAUSE_AT || '75', 10);
const stopAt = parseInt(process.env.USAGE_STOP_AT || '90', 10);

const result = guard({ pauseAt, stopAt });

console.log(JSON.stringify(result, null, 2));

if (result.action === 'stop') process.exit(2);
if (result.action === 'pause') process.exit(1);
process.exit(0);
