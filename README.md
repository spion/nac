# ploy

ploy is a simple process / app control and monitoring daemon written in node

ploy is multi-server-aware which allows you to use
it with parallel control tools such as [pssh](http://www.theether.org/pssh/),
[cssh](http://sourceforge.net/projects/clusterssh/),
[fabric](http://docs.fabfile.org/en/1.6/), or, in the future,
**rploy**

# how it works

Write a ployfile for your project (the syntax is CSON)

```coffeescript
name: "myproject"
command: "node myproject.js" 
env: 
  NODE_ENV: "production",
  PORT: 5000
```

Add the ployfile to git, clone the project on your server and run
the command

    ploy add ployfile.cson
    ploy start myproject 

# other configuration options

There are two types of configuration files in ploy:
* project configuration (ployfile)
* server daemon configuration (ployd.conf)

Here is a complete example ployfile:

```coffeescript
  name: "myproject"
  command: "node myproject.js"
  # you can run multiple instances
  instances: 4
  # extra arguments to add
  args: 
    # long arguments are prefixed with --
    longarg: "value",
    # one-letter arguments are prefixed with -
    s: "shortarg value",
    # you can add an explicit prefix if you wish
    "--explicit-form": "value"  
  env: 
    NODE_ENV: "production",
    # every string from the configuration is processed using handlebars
    PORT: "{{instance + 5000}}"
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
      instances: 6,
      env: 
        REDIS_SERVER: 'localhost'
```

ployd.conf is located in /etc - here is the /etc/ployd.conf in one.myproject.com

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

The next command will assume that `name = myproject`

#### start, stop, restart

    ploy [start|stop|restart] myproject

Start/stop/restart the N instances of `myproject` using the command, 
arguments and environment variables specified in the config file. 

You can also start/stop/restart individual instances, e.g.

    ploy [start|stop|restart] myproject-1

### remove 

    ploy remove myproject

Will remove the project and its ployfile from the daemon and stop
all instances.

### log

    ploy log myproject

Show stdout/stderr logs for the project. Logs will be displayed in the format

[instance] [iso-date] [stdout|stderr]: content

Arguments:
* --stdout - show just stdout
* --stderr - show just stderr
* --past <time> - show just the past X weeks/days/hours/minutes/seconds e.g. --past 2m (default 1h)
* --duration <time> - show the specified diration (--past required)
* --from <date> - alternative to --past
* --to <date> - alternative to --duration (--from required)
* --instance <x> - filter by instance number

### run

    ploy run myproject <script> [args]

Run one of the scripts for the project with the specified arguments. Will
display the output of the script.

# parameterized configuration

The strings in `command`, `env`, `args` and `scripts` are processed using
a handlebars-like template language.

The following variables are available in all strings: 

* ployfile - path to the ployfile
* appdir - the directory of the ployfile
* config - the entire config object with processed overrides but unprocessed templates

The following variable is available everywhere except in `scripts`

* instance - number of started instance, 0 &lt; `instance` <= `instances`

If `instances` is not defined in the config file, `instance` will be `1`

# licence

MIT

