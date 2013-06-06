# ploy

ploy is a simple process / app control and monitoring daemon written in node

ploy is multi-server-aware which allows you to use
it with parallel control tools such as [pssh](http://www.theether.org/pssh/),
[cssh](http://sourceforge.net/projects/clusterssh/),
[fabric](http://docs.fabfile.org/en/1.6/), or, in the future,
**rploy**

# how it works

Write a ployfile for your project. The syntax is [CSON](https://github.com/bevry/cson),
which is similar to JSON.

```coffeescript
name: "myproject"
command: "node myproject.js" 
env: 
  NODE_ENV: "production",
  PORT: 5000
```

Add the ployfile to git, clone the project on your server and run
the command

    # ploy add ployfile.cson
    Added myproject
    # ploy start myproject 

# other configuration options

There are two types of configuration files in ploy:

* project configuration (ployfile)
* server daemon configuration (ployd.conf)

Here is a complete example ployfile:

```coffeescript

  name: "myproject"
  # command to execute. It doesn't have to be a JS file
  command: "myproject-cluster.js"
  # working dir relative to the ployfile
  cwd: "."

  # extra arguments to add
  args: 
    # long arguments are automatically prefixed with --
    longarg: "value",
    # one-letter arguments are prefixed with -
    s: "shortarg value",
    # you can add an explicit prefix if you wish
    "--explicit-form": "value"
    # and you can define a list of additional arguments

  # environment variables
  env: 
    NODE_ENV: "production",
    # clustering is best left to the app
    workers:4
 
  # you can add additional scripts which will become available
  # as commands for the specific project
  scripts: 
    deploy: "scripts/deploy.sh",
    report: "scripts/statusReport.sh"

  # override options on a per-server-tag basis
  servers: 
    "two.myproject.com": 
      env: 
        REDIS_SERVER: 'one.myproject.com'
    "one.myproject.com":
      env: 
        # even though ploy doesnt handle clustering, it
        # can pass clustering configuration via env and args 
        # on a per-server basis
        workers: 6,
        REDIS_SERVER: 'localhost'
```

`ployd.conf` is located in `/etc`. 

Example `/etc/ployd.conf` for `one.myproject.com`:

```coffeescript
tags: ["one.myproject.com", "one", "myproject-servers"]
```

Since one.myproject.com has the tag "one.myproject.com", it will apply the 
specified config overrides for that tag

# available commands

#### create

    ploy add ployfile.cson

Adds the specified ployfile to the daemon.

The name specified in ployfile.cson must be unique for that server
and user. If the user already has an app running under that name, on
that server, ploy will complain

The next commands will assume that `name = myproject`

#### start, stop, restart

    ploy [start|stop|restart] myproject

Start/stop/restart the app `myproject` using the command, 
arguments and environment variables specified in the config file. 

#### kill

    ploy kill myproject <SIGNAL>

Send the specified named signal to the app's process. Useful for
user-defined signals such as cluster reloading

#### remove 

    ploy remove myproject

Will remove the project and its ployfile from the daemon and stop
the app process

#### update

    ploy update <myproject|configpath>

Will update the configuration file. If you omit the path, `ployd`
will attempt to reload the configuration file from the same location
as previously specified. If you omit the project name instead,
`ployd` will read the name from the config file, update the apps's
configuration and update the location of the config file for that app

#### log

    ploy log myproject

Show stdout/stderr logs for the project. Logs will be displayed in the format

[iso-date] [stdout|stderr]: content

Arguments:
* --stdout - show just stdout
* --stderr - show just stderr
* --past <time> - show just the past X weeks/days/hours/minutes/seconds e.g. --past 2m (default 1h)
* --duration <time> - show the specified diration (--past required)
* --from <date> - alternative to --past
* --to <date> - alternative to --duration (--from required)

### run

    ploy run myproject <script> [args]

Run one of the scripts for the project with the specified arguments. Will
display the output of the script.

# environment variables

When running the app or its custom script, `ploy` sets the following environment
variables:

* PLOYFILE - full path to the ployfile 
* PLOYDIR  - absolute working directory of the app

# licence

MIT

