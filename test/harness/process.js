#!/usr/bin/env node

var args = require('optimist').argv;


console.log(process.env.ENV_TEST || "Hello world");


// Stay in the background
setInterval(function () {

}, 10000);


if (args.die) setTimeout(function () {
    console.error("Had fatal error!");
    process.exit(args.code || 0);
}, args.die || 1);


process.on('SIGUSR2', function() {
    console.log("SIGUSR2");
});
