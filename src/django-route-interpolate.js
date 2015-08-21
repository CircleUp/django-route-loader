/*jslint node: true, nomen: true, vars: true, regexp: true */

'use strict';

var _ = require('lodash');

var MATCH_ONE = /%\([^\)]*\)[a-z]/;

function regexQuote(str) {
    return String(str).replace(/[.?*+\^$\[\]\\(){}|\-]/g, "\\$&");
}

function djangoRouteInterpolate(possibilities, args, kwargs) {
    var found = _.find(possibilities, function (obj) {
        var route = obj.possibility[0][0];

        _.each(kwargs, function (value, key) {
            route = route.replace(new RegExp(regexQuote('%(' + key + ')') + '[a-z]', 'g'), value);
        });

        _.each(args, function (value) {
            route = route.replace(MATCH_ONE, value);
        });

        if (MATCH_ONE.test(route)) {
            return false;
        }

        obj.resolved = route;
        return true;
    });
    if (found) {
        return found.resolved;
    }
}

function djangoRoute(possibilities) {
    return function () {
        var args = [],
            kwargs = {};

        _.each(arguments, function (arg) {
            if (_.isObject(arg)) {
                _.extend(kwargs, arg);
            }
            args.push(arg);
        });

        return djangoRouteInterpolate(possibilities, args, kwargs);
    };
}

module.exports = djangoRoute;
module.exports.fixed = djangoRouteInterpolate;
