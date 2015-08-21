/*jslint node: true, nomen: true, vars: true */

'use strict';

var _ = require('lodash'),
    path = require('path'),
    url_parse = require('url').parse,
    djangoRouteResolver = require('./django-route-resolver'),
    toInline = require('function-code').inline;

function djangoRouteLoader(opts) {
    var CACHED_VIEWNAMES = [],
        resolveRoute = djangoRouteResolver(opts);

    function loader() {
        throw new Error('This plugin requires pitching');
    }

    loader.pitch = function (filename) {
        var that = this,
            callback = this.async(),
            viewname = url_parse(filename).query;

        this.cacheable();

        // There has to be a better way to detect dependency changes
        if (_.includes(CACHED_VIEWNAMES, viewname)) {
            resolveRoute.end();
            resolveRoute = djangoRouteResolver(opts);
            CACHED_VIEWNAMES = [];
        }
        CACHED_VIEWNAMES.push(viewname);

        resolveRoute(viewname).then(function (data) {
            /*global __interpolatepath, __possibilities */
            var route_module = toInline(function () {
                var djangoRouteInterpolate = require(__interpolatepath);
                module.exports = djangoRouteInterpolate(__possibilities);
            }).replace(
                '__interpolatepath',
                JSON.stringify(path.join(__dirname, 'django-route-interpolate'))
            ).replace(
                '__possibilities',
                JSON.stringify(data.possibilities)
            );

            _.each(data.python_dependency_list, function (python_dependency) {
                that.dependency(python_dependency);
            });

            callback(false, route_module);
        }, function (err) {
            callback(err);
        });
    };

    return loader;
}

module.exports = djangoRouteLoader();
module.exports.djangoRouteLoader = djangoRouteLoader;
