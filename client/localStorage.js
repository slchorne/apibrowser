//
// do most stuff as a 'service' service, to keep it out of the controller
// http://tylermcginnis.com/angularjs-factory-vs-service-vs-provider/
// (services don't have namespace hardcoding), and instintiate copies
//
// ideally we want an app agnostic module
// angular.module('jsonFormatter', ['RecursionHelper'])

// create a local storage module
// don't pollute the global namespace
angular.module('localStorageModule', [])
  .service('localStorageService',function($window, $rootScope){

    var keyname = 'WapiBrowser';
    this.setData = function(val) {
        var jval = angular.toJson(val);
        $window.localStorage && $window.localStorage.setItem(keyname, jval);
        return this;
    };
    this.getData = function() {
        var jval = $window.localStorage && $window.localStorage.getItem(keyname);
        return angular.fromJson(jval);
    };
    return this ;

});
