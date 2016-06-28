// script.js

//
// do most stuff as a 'service' service, to keep it out of the controller
// and the global namespace
// http://tylermcginnis.com/angularjs-factory-vs-service-vs-provider/
// (services don't have namespace hardcoding), and instintiate copies
//
// ideally we want an app agnostic module
// angular.module('jsonFormatter', ['RecursionHelper'])

//
// WAPI handlers, as a service :
// http://weblogs.asp.net/dwahlin/using-an-angularjs-factory-to-interact-with-a-restful-service
// this keeps the URL and headers internal to this module
// and you can bundle the error handler getErrorMsg()
//
// wapi.get(path).then()

angular.module('wapiModule', [])
    // private values
    .value('wapiConfig',{
        server: null,
        url: null,
        proxy: '/wapip/',
        version: '2.0',
        maxVersion : null,
        baseParams : {
            '_return_as_object' : 1
        }
    })


    // remember to pass in the values to the service
    .service('wapi',function($http,wapiConfig){
        var me = this ;

        //----------------------
        // private functions (well, this is a service, there is no privacy)
        // called as 'me.func()'

        this.test = function(msg) {
            console.log ('wapi.test :', msg);
        };

        //----------------------
        // public functions

        this.getConfig = function() {
            return wapiConfig ;
        };

        this.getBaseParams = function() {
            return me.getConfig().baseParams ;
        };

        //
        // -- [ ] GNDN ?
        this.getUrl = function() {
            // var conf = me.getConfig();
            return me.getConfig().url ;
        };

        //
        // return just the path part of the URL
        //
        this.getPath = function() {
            var conf = me.getConfig();
            return conf.server +
                '/wapi/v' + conf.version + '/';
        };

        //
        // return the base64 Authorization string
        //
        this.getAuthKey = function() {
            console.log ( 'ak' , me.getConfig() );
            return me.getConfig().authkey ;
        };

        //
        // change the proxy, which changes the URL
        //
        this.setProxy = function(proxy) {
            var conf = me.getConfig();
            conf.proxy = proxy;
            // call setVersion which sets the URL
            me.setVersion();
        };

        // set the WAPI version and update the url
        // if called with no args, use the default
        this.setVersion = function(rev) {
            var conf = me.getConfig();
            if ( rev ) {
                conf.maxVersion = rev;
                conf.version = rev;
            }

            // to avoid XSS problems we punt to ourselves, with a proxy URL
            // and we can switch that at any time by changing the proxy.

            conf.url = conf.proxy + conf.server +
                '/wapi/v' + conf.version + '/';
        };

        //
        // configure and save the all the REST settings
        // we are passed in an object :
        // {
        //    server : REQUIRED
        //    name : REQUIRED
        //    password : Optional
        //    authkey :  Optional
        //  }
        //

        this.session = function(args) {
            // generate the Authorization and keys
            var credentials ;
            if ( args.authkey) {
                credentials = args.authkey ;
            }
            if ( args.name && args.password ) {
                credentials = btoa( args.name + ':' + args.password );
            }
            var authorization = {'Authorization': 'Basic ' + credentials };

            // save it all
            var conf = me.getConfig();

            conf.server = args.server ;
            conf.user = args.name ;
            conf.authkey = credentials ;

            me.setVersion();

            // we may need to make this another method, depending on where
            // we have to call it
            conf.httpConfig = {
                withCredentials: true,
                headers: authorization
            };

            // console.log ('session', conf , args );
            return this ;
        };

        //
        // remove any authkeys, reset any cookies
        //
        this.logout = function() {
            var conf = me.getConfig();
            me.session({
                server : conf.server
            });
            return this ;
        };

        //
        // $http handlers...
        // build a call from the config and the path
        // return the $promise so we can use '.then()'
        //
        this.get = function( path ) {
            var conf = me.getConfig();
            return $http.get(conf.url + path , conf.httpConfig );
        };

        //
        // error re-formatting handlers
        //
        this.getErrorMsg = function(response) {
            // Errors can be text, HTML, XML or json,
            // so we try and parse them as best we can
            console.log ( 'getErrorMsg:resp',response);

            var msg = response.data ;

            // and angular tries to autotransform the data, so it may or may
            // not be an object already from something that may have been json

            if ( response.data ) {
                if ( response.data.syscall ||
                     response.data.data ||
                     response.data.Error ) {
                     // we are probably a clean object
                     msg = angular.toJson( response.data );

                     if ( response.data.Error ) {
                         msg = response.data.Error;
                     }
                }
            }

            if ( response.status == 401 ) {
                msg = "Authorization Required: You supplied the wrong credentials (e.g., bad password)";
            }

            // anything else can be taken verbatim no need to convert
            //  if ( msg.match(/DOCTYPE HTML/)) {

            return response.status + " : " + msg ;
        };

        return this ;
});
