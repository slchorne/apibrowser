// script.js

// create the module and name it viewApp
// also include the router module for some later fancy stuff we aren't
// using now
var viewApp = angular.module('viewApp', ['jsonFormatter']);

// [ ] we can't use views, as the context scope keeps switching
// we should try to use just show and hide

// create the controller and inject Angular's $scope
// we will use this to call methods on this controller to
// switch views
//
// every HTML element can really only have one controller, unless you are
// using routes, where the context of the controller changes because the
// URL changed. so if you aren't using routes == one controller for that
// block.
//
// you also can't easily call a controller from another controler, so
// everything for this view has a single controller
//
// BUT - you can pass events between controllers, and listen for them
// function FirstController($scope) {
//     $scope.$on('someEvent', function(event, args) {});}
// function SecondController($scope) {
//     $scope.$emit('someEvent', args);}
//

// Global state variables
var wapi = {
    server: null,
    url: null,
    proxy: '/wapip/',
    version: '2.0',
    maxVersion : '2.0'
};

// localstorage handlers, built as a factory
viewApp.factory("$localStorage", function($window, $rootScope) {
  var keyname = 'WapiBrowser';
  return {
    setData: function(val) {
      var jval = angular.toJson(val);
      $window.localStorage && $window.localStorage.setItem(keyname, jval);
      return this;
    },
    getData: function() {
      var jval = $window.localStorage && $window.localStorage.getItem(keyname);
      return angular.fromJson(jval);
    }
  };
});

//
// initial global functions, outside of $scope to
// avoid race conditions with the parser
//
var setAuthHeader = function(authkey) {
    var authorization = {'Authorization': 'Basic ' + authkey};
    wapi.headers = { headers: authorization };
    return wapi.headers;
};


viewApp.controller('mainController',
    function($scope,$http,$localStorage,$filter) {

    // create scope variables that link to the view(s)
    $scope.formFields = {};
    $scope.searchFields = {};
    $scope.schemaLoaded = false ;

    // local storage could be empty
    var vls = $localStorage.getData();
    $scope.formFields = vls ? vls : {};
    console.log ( 'load local storage', vls );

    // any more code has to run at the END of this controller
    // AFTER we have defined any methods that we want to use.

    //-- methods go here --

    //
    // the initial login function
    //
    $scope.saveUser = function() {

        // create a copy of the fields so we can massage the data,
        var cred = angular.copy($scope.formFields);

        // create the basic auth
        var credentials = btoa( cred.name + ':' + cred.password );
        setAuthHeader(credentials);

        // cleanse the password and store the keys
        delete cred.password;
        cred.authkey = credentials ;
        // console.log ( 'header', wapi.headers);
        // console.log( 'save user', cred );

        $localStorage.setData(cred);
        wapi.server = $scope.formFields.server;

        // now we can load the schema
        $scope.getSchema();

    };

    //
    // load the schema and check the supported version
    //
    $scope.getSchema = function() {

        // generate the URL for the server
        // to avoid XSS problems we punt to ourselves, with a proxy URL
        // so we just keep the domain part of the url
        wapi.url = wapi.proxy + wapi.server +
            '/wapi/v' + wapi.version + '/';

        console.log( 'connect to ', wapi.url );

        // [ ] you have to make 1 call to get the latest version,
        // then a second call to get the schema for that version
        // as the schema returns version specific data

        // then make a request to get the schema
        // we should only have to set the headers once,
        // the cookie should do the rest
        $http.get(wapi.url +'?_schema' , wapi.headers )
            .then(function(response){
                // success
                console.log( 'schema' , response.data );

                // punt to check the API version
                $scope.checkApiVersion(response.data);

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
            });

    };

    $scope.checkApiVersion = function(data) {
        var vlist = data.supported_versions;
        wapi.maxVersion = vlist[vlist.length-1];
        wapi.version = wapi.maxVersion;
        wapi.path = wapi.server + '/wapi/v' + wapi.version + '/';
        wapi.url = wapi.proxy + wapi.path ;

        console.log ( 'max rev', wapi);
        // then re-load the schema
        $scope.getLatestSchema();
    };

    $scope.getLatestSchema = function() {
        // now we have the CORRECT version for this api,
        // load the correct schema

        $http.get(wapi.url +'?_schema' , wapi.headers )
        // $http.get(wapi.url +'?_schema' )
            .then(function(response){
                // success
                console.log( 'new schema' , response.data );
                console.log( 'wapi' , wapi );

                // and now load this in the HTML
                // and switch the views
                $scope.listObjects(response.data);

                // $scope.$parent.goTo('objects',response.data);
                // console.log('switched');

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
            });

    };

    //
    // handler to render the list of objects to work on
    // and switch the views
    //
    $scope.listObjects = function(data) {
        // hardcode the view
        // then just expose the data to the HTML
        // and process it there
        $scope.objects = data.supported_objects;
        $scope.template = "objects.html";
        $scope.message = 'This is the settings page';
    };

    //
    // handler for when we input search values to generate
    // a real-time query string.
    //
    $scope.generateSearchQuery = function(el) {
        // console.log('field change',el);

        // the html will add a new field to the schema 'fieldValue'
        // and some modifier flags
        // which we can use to extract the values and form a query string

        // We have to process each name value pair and build up a query string
        // so we may as well just walk the whole array
        // and not start with a filter

        // var useFields = $scope.schemaFields.filter(function(a) {
        //     return a.fieldValue ? true : false; });

        var qs = [];
        angular.forEach($scope.schemaFields, function(field){
            if ( field.fieldValue ) {
                var qv = field.name ;
                qv += field.modCase ? ':' : '' ;
                qv += field.modContains ? '~' : '' ;
                qv += '=' + field.fieldValue;
                qs.push(qv);
                // console.log ('qv', qv, field );
            }
        });
        var queryString = qs.join('&');
        // reset the search url
        // $scope.searchUrl = wapi.url + $scope.myObject + '?' + queryString ;
        var searchPath = $scope.myObject + '?' + queryString;
        // (display only)
        $scope.searchUrl = 'https://'+ wapi.path + searchPath ;

        return searchPath ;

        // var searchPath = $scope.generateSearchQuery();

    };

    //
    // do the specific object search
    //
    $scope.searchForObject = function(el) {
        // console.log('search fields',$scope.schemaFields);

        var searchPath = $scope.generateSearchQuery();
        // (display only, should be redundant)
        $scope.searchUrl = 'https://'+ wapi.path + searchPath ;

        // and punt to a search
        $http.get( wapi.url + searchPath , wapi.headers )
            .then(function(response){
                // success
                console.log( 'object search ' , response.data );

                // then just expose the data to the HTML
                // and process it there
                $scope.searchResults = response.data;

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
            });
    };

    //
    // handler to make the object search form and page
    //
    $scope.searchObjectPage = function(myObj) {
        console.log( 'switch to search ' , myObj );
        $scope.myObject = myObj;
        $scope.template = "search.html";
        $scope.searchUrl = 'https://'+ wapi.path + myObj ;
        $scope.searchResults = null ;

        // define some filters for listing the schema
            // return element.name.match(/=/) ? true : false;
        $scope.searchableFields = function(element) {
            // check if the field exists
            // console.log ( 'filter elem', element );
            return element.searchable_by ? true : false;
        };

        $scope.fieldIsBoolean = function(element) {
            return element.type.indexOf('bool') >= 0 ? true : false;
        };
        $scope.modifierContains = function(element) {
            return element.searchable_by.match(/~/) ? true : false;
        };
        $scope.modifierCase = function(element) {
            return element.searchable_by.match(/:/) ? true : false;
        };

        // get the schema for this object and expose it to the html
        $http.get(wapi.url + myObj + '?_schema' , wapi.headers)
            .then(function(response){
                // success
                console.log( 'object schema' , response.data );

                // then just expose the data to the HTML
                // and process it there
                $scope.schemaLoaded = true ;
                $scope.schemaFields = response.data.fields;

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
            });

    };

    // and now a function to switch into different templates without
    // using routes, this is used by the navbar
    //
    $scope.goTo = function(myView,data) {
        // console.log( 'switch to view ' , myView , ' scope:' , $scope );
        // $scope.template = "pages/home.html";
        $scope.template = myView + ".html";
        $scope.schemaLoaded = false ;
        $scope.message = 'This is the '+ myView + ' message';
    };
    /*
    */

    //*****************
    // MAIN code
    // Called when we first launch the controller
    //*****************

    // work out which view to show
    // by setting the template
    if ( vls && vls.authkey ) {
        // We have logged in before, and we can jump to the objects list
        setAuthHeader(vls.authkey);
        wapi.server = vls.server;
        $scope.template = "objects.html";

        console.log ( 're-use credentials', wapi);
        $scope.getSchema();
    }
    else {
        // prompt for a login
        $scope.template = "settings.html";
    }

});
