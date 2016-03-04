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
  return {
    setData: function(val) {
      var jval = angular.toJson(val);
      $window.localStorage && $window.localStorage.setItem('my-storage', jval);
      return this;
    },
    getData: function() {
      var jval = $window.localStorage && $window.localStorage.getItem('my-storage');
      return angular.fromJson(jval);
    }
  };
});

viewApp.controller('mainController',
    function($scope,$http,$localStorage,$filter,Base64) {

    // create scope variables that link to the view(s)
    $scope.formFields = {};
    $scope.searchFields = {};

    //
    var vls = $localStorage.getData();
    $scope.formFields = vls ;
    console.log ( 'load local storage', vls );

    // set a default template for our view, usually the settings
    $scope.template = "settings.html";
    $scope.message = 'This is the settings';

    //-- methods go here --

    // the initial login function
    $scope.saveUser = function() {
        var cred = $scope.formFields;
        console.log( 'save user', cred );

        // create the basic auth
        var credentials = btoa( cred.name + ':' + cred.password );
        var authorization = {'Authorization': 'Basic ' + credentials};
        wapi.headers = { headers: authorization };

        console.log ( 'header', wapi.headers);

        $localStorage.setData($scope.formFields);

        // generate the URL for the server
        // to avoid XSS problems we punt to ourselves, with a proxy URL
        // so we just keep the domain part of the url
        wapi.server = $scope.formFields.server;
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
                console.log( 'wapi' , wapi );
                $scope.checkSchema(response.data);
                $scope.listObjects(response.data);

                // $scope.$parent.goTo('objects',response.data);
                // console.log('switched');

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
            });

    };

    $scope.checkSchema = function(data) {
        var vlist = data.supported_versions;
        wapi.maxVersion = vlist[vlist.length-1];
        wapi.version = wapi.maxVersion;
        wapi.url = wapi.proxy + wapi.server +
            '/wapi/v' + wapi.version + '/';

        console.log ( 'max rev', wapi);
    };

    //
    // handler to render the list of objects to work on
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
    // -- GNDN for now --
    //
    $scope.generateSearchQuery = function(el) {
        console.log('field change',el);
    };

    //
    // do the specific object search
    //
    $scope.searchForObject = function(el) {
        // console.log('search fields',$scope.schemaFields);

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
                qv += field.modCase ? ':' : null ;
                qv += field.modContains ? '~' : null ;
                qv += '=' + field.fieldValue;
                qs.push(qv);
                console.log ('qv', qv);
            }
        });
        var queryString = qs.join('&');
        // reset the search url
        $scope.searchUrl = wapi.url + $scope.myObject + '?' + queryString ;

        // and punt to a search
        $http.get( $scope.searchUrl )
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
        $scope.searchUrl = wapi.url + myObj ;
        $scope.searchResults = null ;

        // define some filters for listing the schema
            // return element.name.match(/=/) ? true : false;
        $scope.searchableFields = function(element) {
            // check if the field exists
            // console.log ( 'filter elem', element );
            return element.searchable_by ? true : false;
        };
        $scope.modifierCase = function(element) {
            return element.searchable_by.match(/:/) ? true : false;
        };
        $scope.modifierContains = function(element) {
            return element.searchable_by.match(/~/) ? true : false;
        };

        // get the schema for this object and expose it to the html
        $http.get(wapi.url + myObj + '?_schema' )
            .then(function(response){
                // success
                console.log( 'object schema' , response.data );

                // then just expose the data to the HTML
                // and process it there
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
        console.log( 'switch to view ' , myView , ' scope:' , $scope );
        // $scope.template = "pages/home.html";
        $scope.template = myView + ".html";
        $scope.message = 'This is the '+ myView + ' message';
    };
    /*
    */
});

viewApp.factory('Base64', function () {
    /* jshint ignore:start */

    var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    return {
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3 = "";
            var enc1, enc2, enc3, enc4 = "";
            var i = 0;

            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                    keyStr.charAt(enc1) +
                    keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) +
                    keyStr.charAt(enc4);
                chr1 = chr2 = chr3 = "";
                enc1 = enc2 = enc3 = enc4 = "";
            } while (i < input.length);

            return output;
        },

        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3 = "";
            var enc1, enc2, enc3, enc4 = "";
            var i = 0;

            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            var base64test = /[^A-Za-z0-9\+\/\=]/g;
            if (base64test.exec(input)) {
                window.alert("There were invalid base64 characters in the input text.\n" +
                    "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
                    "Expect errors in decoding.");
            }
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }

                chr1 = chr2 = chr3 = "";
                enc1 = enc2 = enc3 = enc4 = "";

            } while (i < input.length);

            return output;
        }
    };

    /* jshint ignore:end */
});
