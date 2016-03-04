// script.js

// create the module and name it viewApp
// also include the router module for some later fancy stuff we aren't
// using now
var viewApp = angular.module('viewApp', []);

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

// local storage handlers
viewApp.factory("LS", function($window, $rootScope) {
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

viewApp.controller('mainController', function($scope,$http,LS) {

    // create scope variables that link to the view(s)
    $scope.formFields = {};

    //
    var vls = LS.getData();
    $scope.formFields = vls ;
    console.log ( 'load local storage', vls );

    // set a default template for our view, usually the settings
    $scope.template = "settings.html";
    $scope.message = 'This is the settings';

    //-- methods go here --

    // the initial login function
    $scope.saveUser = function() {
        console.log( 'save user', $scope.formFields );

        LS.setData($scope.formFields);

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
        $http.get(wapi.url +'?_schema' )
            .then(function(response){
                // success
                console.log( 'schema' , response.data );
                console.log( 'wapi' , wapi );
                $scope.$parent.checkSchema(response.data);
                $scope.$parent.listObjects(response.data);

                // $scope.$parent.goTo('objects',response.data);
                console.log('switched');

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
            });

        // because we're inside the template, we need to switch
        // $scope to the $parent
        //$scope.goTo('objects');
        // $scope.$parent.goTo('objects');

    };

    $scope.checkSchema = function(data) {
        var vlist = data.supported_versions;
        wapi.maxVersion = vlist[vlist.length-1];
        wapi.version = wapi.maxVersion;
        wapi.url = wapi.proxy + wapi.server +
            '/wapi/v' + wapi.version + '/';

        console.log ( 'max rev', wapi);
    };

    // handler to render the list of objects
    $scope.listObjects = function(data) {
        // hardcode the view
        // console.log( 'switch to objects view ' , data );
        $scope.objects = data.supported_objects;
        $scope.template = "objects.html";
        $scope.message = 'This is the settings page';
    };

    $scope.searchObject = function(myObj) {
        console.log( 'switch to search ' , myObj );
        $scope.myObject = myObj;
        $scope.template = "search.html";

        // define some filters for listing the schema
            // return element.name.match(/=/) ? true : false;
        $scope.searchableFields = function(element) {
            // check if the field exists
            // console.log ( 'filter elem', element );
            return element.searchable_by ? true : false;
        };

        // get the schema for this object
        $http.get(wapi.url + myObj + '?_schema' )
            .then(function(response){
                // success
                console.log( 'object schema' , response.data );
                $scope.schema = response.data.fields;

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
            });
    };

    // and now a function to switch into different templates without
    // using routes, used by the navbar
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
