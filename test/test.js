/*jslint node: true, nomen: true, vars: true */

'use strict';

let _ = require('lodash');
let test = require('tap').test;
let djangoRouteInterpolate = require('../src/django-route-interpolate');
let djangoRouteResolver = require('../src/django-route-resolver');

let Promise = require('bluebird');
let path = require('path');
let fs = Promise.promisifyAll(require('fs'));
let child_process = Promise.promisifyAll(require('child_process'));

const VIRTUALENV_PATH = path.join(__dirname, '..', '.virtualenv');
const DJANGO_EXAMPLE_PATH = path.join(__dirname, 'example');
const DJANGO_VERSION = process.env.DJANGO_VERSION || '1.8.4';

test('unit tests', (t) => {
    const TEST_ROUTE = [{"pattern": "foo/bar/(?P<user_id>[\\d-]+)/$", "defaults": {}, "possibility": [["foo/bar/%(user_id)s/", ["user_id"]]]}];

    test('interpolation API', (t) => {
        t.plan(2);
        t.equals(djangoRouteInterpolate.fixed(TEST_ROUTE, [], {user_id: 123}), 'foo/bar/123/');
        t.equals(djangoRouteInterpolate.fixed(TEST_ROUTE, [123]), 'foo/bar/123/');
    });

    test('pretty api', (t) => {
        t.plan(2);
        let my_route = djangoRouteInterpolate(TEST_ROUTE);
        t.equals(my_route({user_id: 123}), 'foo/bar/123/');
        t.equals(my_route(123), 'foo/bar/123/');
    });

    t.end();
});

test('django integration', (t) => {
    t.plan(3);

    virtualenv().then((env) => {
        env.DJANGO_SETTINGS_MODULE = 'settings';
        env.PYTHONPATH = path.join(DJANGO_EXAMPLE_PATH, 'example');
        return djangoRouteResolver({env: env, cwd: DJANGO_EXAMPLE_PATH});
    }).then((resolveRoute) => {
        resolveRoute('index').then((data) => {
            includesPartialItem(t, data.python_dependency_list, 'example/urls.pyc');
            includesPartialItem(t, data.python_dependency_list, 'example/app/urls.pyc');
            t.equal('app/', djangoRouteInterpolate.fixed(data.possibilities, [], {}));
        });

        resolveRoute.end();
    });
});

function includesPartialItem(t, list, text, message) {
    t.ok(Boolean(_.find(list, (x) => x.indexOf(text) >= 0)), message);
}

function virtualenv() {
    return fs.statAsync(VIRTUALENV_PATH).catch(() => new Promise((resolve, reject) => {
        let ps = child_process.spawn('sh', {stdio: ['pipe', 'ignore', process.stderr]});
        ps.on('exit', (code) => code === 0 ? resolve() : reject(code));
        ps.stdin.write(`
            virtualenv --no-site-packages ${VIRTUALENV_PATH}
            pip install Django==${DJANGO_VERSION}
        `);
        ps.stdin.end();
    })).then(() => child_process.execAsync(`
        source ${path.join(VIRTUALENV_PATH, 'bin', 'activate')} && env
    `)).spread((stdout) => {
        let obj = {};
        stdout
            .split('\n')
            .filter((x) => x !== '')
            .map((x) => {
                let index = x.indexOf('=');
                obj[x.substr(0, index)] = x.substr(index + 1);
            });
        return obj;
    });
}
