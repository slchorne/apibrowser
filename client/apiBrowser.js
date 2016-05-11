// script.js

// create the module and name it viewApp
// also include the other modules we will need

var viewApp = angular.module('viewApp', [
    'wapiModule',
    'localStorageModule','jsonFormatter']);

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


// remember to add service deps from other modules
viewApp.controller('mainController',
    function($scope,$http,wapi,localStorageService,$filter) {

    // create scope variables that link to the view(s)
    $scope.formFields = {};
    $scope.searchFields = {};
    $scope.schemaLoaded = false ;


    // object to hols the local storage settings.
    // set here as a global, so that other methods can see it
    //
    // local storage could be empty
    // var vls = localstorageservice.getData();
    var vls = localStorageService.getData();
    $scope.formFields = vls ? vls : {};
    console.log ( 'load local storage', vls );

    //*************
    // MAIN CODE IS NOT HERE!!!
    // any more code has to run at the END of this controller
    // AFTER we have defined any methods that we want to use.
    //*************

    //-- methods go here --

    //
    // the initial login function
    //
    $scope.saveUser = function() {

        // create a copy of the fields so we can massage the data,
        var cred = angular.copy($scope.formFields);

        // set up the wapi
        wapi.session( cred );

        // cleanse the password and store the keys
        delete cred.password;
        cred.authkey = wapi.getAuthKey();
        localStorageService.setData(cred);

        // console.log( 'save user', cred );

        // now we can load the schema
        $scope.getSchema();

    };

    $scope.logout = function() {
        wapi.logout();

        // and reset the local vars
        $scope.formFields.name = null ;
        vls.authkey = null ;
        localStorageService.setData(vls);

        // console.log('logout', wapi.getConfig());

    };

    //
    // load the schema and check the supported version
    //
    $scope.getSchema = function() {

        // generate the URL for the server
        // to avoid XSS problems we punt to ourselves, with a proxy URL
        // so we just keep the domain part of the url
        // wapi.url = wapi.proxy + wapi.server +
        //     '/wapi/v' + wapi.version + '/';

        console.log( 'get schema', wapi.getUrl() );

        // you have to make 1 call to get the latest version,
        // then a second call to get the schema for that version
        // as the schema returns version specific data

        // then make a request to get the schema
        // we should only have to set the headers once,
        // the cookie should do the rest

        $scope.httpErrors = null;
        $scope.objectErrors = "Getting supported objects...";

        // $http.get(wapi.url +'?_schema' , wapi.headers )
        wapi.get('?_schema')
            .then(function(response){
                // success
                // console.log( 'schema' , response.data );

                // punt to check the API version
                $scope.checkApiVersion(response.data);

            },function(response){
                // error, HTTP errors
                // console.log( 'HTTP error' );
                $scope.httpErrors = wapi.getErrorMsg( response );
            });

    };

    //
    // now that we've loaded an initial schema, we need to
    // see if out version numbers are out of date
    //
    $scope.checkApiVersion = function(data) {
        var vlist = data.supported_versions;

        var maxRev = vlist[vlist.length-1];
        wapi.setVersion(maxRev);

        // then re-load the schema
        $scope.getLatestSchema();
    };

    $scope.getLatestSchema = function() {
        // now we have the CORRECT version for this api,
        // load the correct schema

        $scope.httpErrors = null;
        wapi.get('?_schema')
            .then(function(response){
                // success
                console.log( 'new schema' , response.data );

                // and now load this in the HTML
                // and switch the views
                $scope.listObjects(response.data);
                $scope.objectErrors = null ;

                // $scope.$parent.goTo('objects',response.data);
                // console.log('switched');

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
                $scope.httpErrors = wapi.getErrorMsg( response );
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
        // via ngModel, and some modifier flags
        // which we can use to extract the values and form a query string

        // We have to process each name value pair and build up a query string
        // so we may as well just walk the whole array
        // and not start with a filter

        // var useFields = $scope.schemaFields.filter(function(a) {
        //     return a.fieldValue ? true : false; });

        // we also want to track the _return_fields

        var qs = [];
        var rfields = [];
        angular.forEach($scope.schemaFields, function(field){
            if ( field.fieldValue ) {
                var qv = field.name ;
                qv += field.modCase ? ':' : '' ;
                qv += field.modContains ? '~' : '' ;
                qv += '=' + field.fieldValue;
                qs.push(qv);
                rfields.push(field.name);
                // console.log ('qv', qv, field );
            }
        });

        // add in other fields to return
        if ( $scope.schemaFields._also_return ) {
            rfields.push($scope.schemaFields._also_return);
        }

        // var rstring = '_return_fields%2B='+ rfields.join(',');
        // qs.push( rstring );
        qs.push( '_return_fields%2B='+ rfields.join(',') );

        // 'encodeURIComponent' is too strong a hammer
        // var queryString = encodeURIComponent( qs.join('&') );
        // var queryString = encodeURI( qs.join('&') );
        var queryString = qs.join('&');

        // reset the search url
        var searchPath = $scope.myObject + '?' + queryString;

        // (and for display only)
        $scope.searchUrl = 'https://'+ wapi.getPath() + searchPath ;

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
        $scope.searchUrl = 'https://'+ wapi.getPath() + searchPath ;
        $scope.searchErrors = null;
        $scope.searchResults = "Searching..." ;

        // and punt to a search
        $scope.httpErrors = null;
        // $http.get( wapi.url + searchPath , wapi.headers )
        wapi.get( searchPath )
            .then(function(response){
                // success
                // console.log( 'object search ' , response.data );

                // then just expose the data to the HTML
                // and process it there
                $scope.searchResults = response.data;
                if ( response.data.length === 0 ){
                    $scope.searchErrors = "No objects match the search";
                }

            },function(response){
                // error, HTTP errors
                // [ ] errors need to be passed to a global handler
                console.log( 'HTTP error' , response );
                $scope.httpErrors = response.status + ":" + response.data.Error ;
            });
    };

    //
    // handler to make the object search form and page
    //
    $scope.searchObjectPage = function(myObj) {
        console.log( 'switch to search ' , myObj );
        $scope.myObject = myObj;
        $scope.template = "search.html";
        $scope.searchUrl = 'https://'+ wapi.getPath() + myObj ;
        $scope.searchResults = null ;
        $scope.searchErrors = null;

        // define some filters for listing the schema
            // return element.name.match(/=/) ? true : false;

        $scope.searchableFields = function(element) {
            // check if the field exists
            // console.log ( 'filter elem', element );
            return element.searchable_by ? true : false;
        };
        $scope.nonsearchableFields = function(element) {
            // check if the field exists
            // console.log ( 'filter elem', element );
            return element.searchable_by ? false : true;
        };

        $scope.fieldIsText = function(element) {
            if ( element.type.indexOf('enum') >= 0 ) { return false; }
            if ( element.type.indexOf('bool') >= 0 ) { return false; }
            return true ;
        };
        $scope.fieldIsEnum = function(element) {
            return element.type.indexOf('enum') >= 0 ? true : false;
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

        // ---
        // NOW, make a call to get the schema so we can build the form
        // get the schema for this object and expose it to the html
        $scope.httpErrors = null;

        wapi.get( myObj + '?_schema' )
            .then(function(response){
                // success
                console.log( 'object schema' , response.data );

                // then just expose the data to the HTML
                // and process it there
                $scope.schemaLoaded = true ;
                $scope.schemaFields = response.data.fields;

                if ( response.data.fields.length === 0 ) {
                    $scope.schemaErrors = "This object has no searchable fields";

                }

            },function(response){
                // error, HTTP errors
                console.log( 'HTTP error' );
                $scope.httpErrors = wapi.getErrorMsg( response );
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
        $scope.schemaErrors = null ;
        $scope.message = 'This is the '+ myView + ' message';
    };

    //
    // detect if we are running from a local node instance
    // or from the HTTP file distribution
    // by going to a special URL
    //
    $scope.checkServerTypeAndInit = function() {
        //
        $http.get('/wapi/localserver')
            .then(function(response){
                // success
                console.log( 'local node server' , response.data );
                $scope.checkCredentials();

            },function(response){
                // change the URL type
                console.log( 'No node server, I must be on a GM' );
                wapi.setProxy('https://');
                $scope.checkCredentials();
            });
    };
    /*
    */

    //
    // then see if we have cached credentuals in local storage
    //
    $scope.checkCredentials = function() {

        // work out which view to show
        // by setting the template
        if ( vls && vls.authkey ) {
            console.log ( 're-use credentials', vls);

            // set up the wapi
            wapi.session( vls );

            $scope.template = "objects.html";

            $scope.getSchema();
        }
        else {
            // prompt for a login
            $scope.template = "settings.html";
        }

    };

    //*****************
    // MAIN code
    // Called when we first launch the controller
    //*****************

    // the FIRST thing we do is work our where we are running and
    // thus what out URL path will be

    $scope.checkServerTypeAndInit();

    // (this will then call checkCredentials)


});
