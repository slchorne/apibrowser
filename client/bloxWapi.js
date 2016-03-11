// script.js

//
// do most stuff as a 'service' service, to keep it out of the controller
// http://tylermcginnis.com/angularjs-factory-vs-service-vs-provider/
// (services don't have namespace hardcoding), and instintiate copies
//
// ideally we want an app agnostic module
// angular.module('jsonFormatter', ['RecursionHelper'])

// WAPI handlers, as a service ?
// http://weblogs.asp.net/dwahlin/using-an-angularjs-factory-to-interact-with-a-restful-service
// However, as the .then() call has to live outside the service
// there may not be much value to the service,
// but you could bundle the error handler getErrorMsg()
// wapiService.get(url,successCallback);

// [ ] and you can move the wapi globals and handlers out of
// the global namespace

// Global state variables
var wapi = {
    server: null,
    url: null,
    proxy: '/wapip/',
    version: '2.0',
    maxVersion : null,
};

//
// initial global functions, outside of $scope to
// avoid race conditions with the parser
//
var setAuthHeader = function(authkey) {
    var authorization = {'Authorization': 'Basic ' + authkey};
    wapi.headers = {
        withCredentials: true,
        headers: authorization };
    return wapi.headers;
};

var getErrorMsg = function(response) {
    // Errors can be text, HTML, XML or json,
    // so we try and parse them as best we can
    console.log ( 'getErrorMsg:resp',response);

    var msg = response.data ;

    // and angular tries to autotransform the data, so it may or may
    // not be an object already from something that may have been json
    if ( response.status == 401 ) {

    }

    if ( response.data.syscall
     || response.data.data
     || response.data.Error ) {
         // we are probably a clean object
         msg = angular.toJson( response.data );
         if ( response.data.Error ) {
             msg = response.data.Error;
         }
    }

    if ( response.status == 401 ) {
        msg = "Authorization Required: You supplied the wrong credentials (e.g., bad password)";

    }

    // anything else can be taken verbatim no need to convert
    //  if ( msg.match(/DOCTYPE HTML/)) {

    return response.status + " : " + msg ;
};
