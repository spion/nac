# nac

nac is a simple app control and monitoring daemon written in node

nac is multi-server-aware which allows you to use
it with parallel control tools such as [pssh](http://www.theether.org/pssh/),
[cssh](http://sourceforge.net/projects/clusterssh/),
[fabric](http://docs.fabfile.org/en/1.6/), or, in the future,
**rnac**

# how it works

Write a nacfile for your project. The syntax is [CSON](https://github.com/bevry/cson),
which is similar to JSON.

```coffeescript
name: "myproject"
command: "node myproject.js" 
env: 
  NODE_ENV: "production",
  PORT: 5000
```

Add the nacfile to git, clone the project on your server and run
the command

    # nac add nacfile.cson
    Added myproject
    # nac start myproject 

# other configuration options

There are two types of configuration files in nac:

* project configuration (nacfile)
* server daemon configuration (nacd.conf)

Here is a complete example nacfile:

```coffeescript

  name: "myproject"
  # command to execute. It doesn't have to be a JS file
  command: "myproject-cluster.js"
  # working dir relative to the nacfile
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
    denac: "scripts/denac.sh",
    report: "scripts/statusReport.sh"

  # override options on a per-server-tag basis
  servers: 
    "two.myproject.com": 
      env: 
        REDIS_SERVER: 'one.myproject.com'
    "one.myproject.com":
      env: 
        # even though nac doesnt handle clustering, it
        # can pass clustering configuration via env and args 
        # on a per-server basis
        workers: 6,
        REDIS_SERVER: 'localhost'
```

`nacd.conf` is located in `/etc`. 

Example `/etc/nacd.conf` for `one.myproject.com`:

```coffeescript
tags: ["one.myproject.com", "one", "myproject-servers"]
```

Since one.myproject.com has the tag "one.myproject.com", it will apply the 
specified config overrides for that tag

# available commands

#### create

    nac add nacfile.cson

Adds the specified nacfile to the daemon.

The name specified in nacfile.cson must be unique for that server
and user. If the user already has an app running under that name, on
that server, nac will complain

The next commands will assume that `name = myproject`

#### start, stop, restart

    nac [start|stop|restart] myproject

Start/stop/restart the app `myproject` using the command, 
arguments and environment variables specified in the config file. 

#### kill

    nac kill myproject <SIGNAL>

Send the specified named signal to the app's process. Useful for
user-defined signals such as cluster reloading

#### remove 

    nac remove myproject

Will remove the project and its nacfile from the daemon and stop
the app process

#### update

    nac update <myproject|configpath>

Will update the configuration file. If you omit the path, `nacd`
will attempt to reload the configuration file from the same location
as previously specified. If you omit the project name instead,
`nacd` will read the name from the config file, update the apps's
configuration and update the location of the config file for that app

#### log

    nac log myproject

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

    nac run myproject <script> [args]

Run one of the scripts for the project with the specified arguments. Will
display the output of the script.

# environment variables

When running the app or its custom script, `nac` sets the following environment
variables:

* NACFILE - full path to the nacfile 
* NACDIR  - absolute working directory of the app

# licence

MIT

