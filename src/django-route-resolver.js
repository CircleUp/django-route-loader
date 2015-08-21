/*jslint node: true, nomen: true, vars: true */

'use strict';

let Promise = require('bluebird');
let Queue = require('promise-queue');
let child_process = Promise.promisifyAll(require('child_process'));
let dedent = require('dedent-js');

Queue.configure(Promise);

const PYTHON_LIB_PATH = __dirname;

function djangoRoutePipe(opts) {
    opts = opts || {};
    opts.stdio = ['pipe', 'ipc', 'pipe'];

    let python = child_process.spawn('python', ['-u', '-i'], opts);
    let exit_exception = null;
    let resolve_queue = new Queue(1);

    python.on('exit', (code) => {
        exit_exception = new Error(`Python interpreter closed with code ${code}`);
    });
    python.stdin.write(dedent`
        from __future__ import unicode_literals
        import django
        django.setup()

        import sys
        sys.path.insert(0, ${JSON.stringify(PYTHON_LIB_PATH)})

        from django_route_resolver import ipc, reverse_route
    ` + '\n');
    // python.stdout.on('data', (x) => console.log('STDOUT', x));
    // python.stderr.on('data', (x) => console.log('STDERR', x));

    python.evaluate = (code) => Promise.try(() => {
        if (exit_exception) {
            return Promise.reject(exit_exception);
        }

        return resolve_queue.add(() => {
            python.stdin.write(`ipc(${JSON.stringify(code)})\n`);
            return new Promise((resolve, reject) => {
                let message_handler = (data) => {
                    removeHandlers();
                    resolve(data);
                }
                let exit_handler = (code) => {
                    removeHandlers();
                    reject(new Error(`Python interpreter closed with code ${code}`));
                }
                function removeHandlers() {
                    python.removeListener('message', message_handler);
                    python.removeListener('exit', exit_handler);
                }
                python.once('message', message_handler);
                python.once('exit', exit_handler);
            });
        });
    });

    python.evaluate('1 + 1').then(() => {
        console.log('READY');
        python.stderr.pipe(process.stderr);
    });

    function resolveRoute(name) {
        return python.evaluate(`reverse_route(${JSON.stringify(name)})`);
    }
    resolveRoute.end = function () {
        resolve_queue.add(() => python.stdin.end());
    };
    return resolveRoute;
}

module.exports = djangoRoutePipe;
