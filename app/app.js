'use strict';

var siteHeaderText={};

var downGit = angular.module('downGit', [
	'ngRoute',
	'homeModule',
]);

downGit.config([
    '$routeProvider',
	
    function($routeProvider) {
        $routeProvider
            .when('/', {
                redirectTo: '/home',
            })
			.otherwise({
                redirectTo: '/home',
            });
    }
]);
