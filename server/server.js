var express = require('express');
var fs = require('fs');
var path = require('path');
// var proxy = require('express-http-proxy');
var request = require('request');
//var httpProxy = require('http-proxy');

//var exec = require('child_process').exec;

// set up the apps
var app = express();

// initialisation processes, one time things
var port = process.env.PORT || 3000;

global.__base = path.normalize ( __dirname + '/..' );

var htmlRoot = __base+'/client';

console.log( 'dir' , __dirname );
console.log( 'base' , __base );

//
// error handlers
//

function errorMsg( myCode , myMessage ) {
    return({
        success: false,
        status: 'Error',
        code: myCode,
        message: myMessage
    });
}

function successMsg( myCode , myMessage ) {
    return({
        success: true,
        status: 'OK',
        code: myCode,
        message: myMessage
    });
}

//
// routes will go here
//

// serve static files from the main folder (for the html pages)
// so we can serve additional assets
//
//app.use(express.static(__base+'/client'));
app.use(express.static(htmlRoot));

// and set some options so we can use relative file references
var appOptions = {
    root: htmlRoot,
    dotfiles: 'deny',
  };

// add specific routes for some urls, mapping to html files
//

app.get('/', function(req, res) {
    res.sendFile('index.html');
});
app.get('/wapi/localserver', function(req, res) {
    res.send('this is not a gridmaster');
});

// insert the proxy server for XSS
// This may not work for POST/PUT...
app.use('/wapip', function(req, res) {
  // beware the extra '/'
  var url = 'https:/' + req.url;
  console.log ( 'proxy' , req.url );
  var options = {
      uri: url,
      strictSSL: false
  };
  //req.pipe(request(url)).pipe(res);
  //req.pipe(request(options)).pipe(res);
  req.pipe(request(options)
      // make sure we catch errors
      .on('error', function(err) {
          res.status(404).send(err);
        //   res.send( errorMsg( 404 , err ) );
          console.log(err);
      })
    ).pipe(res);
});



/*
*/

//
// add a 404 hander route
//

app.get('*', function(req, res){
    res.status(404).send("404 not Found");
});

app.listen(port);
console.log('Server started! At http://localhost:' + port);
