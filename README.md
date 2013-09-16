# nac

nac is a simple app control and monitoring daemon written in node

Unlike other process monitors, nac doesn't allow for random spawning and
adding of processes. Instead, nac expects you to add "apps" defined by their 
name and nacfile (procfile-like configuration files)

The nacfile allows you to specify many other things about the process,
such as arguments, environment variable configuration, working directory, 
custom scripts etc. 

nac remembers your apps and will restart them the next time its started.

nac is multi-server-aware which allows you to use it with parallel control 
tools such as [pssh](http://www.theether.org/pssh/),
[cssh](http://sourceforge.net/projects/clusterssh/),
[fabric](http://docs.fabfile.org/en/1.6/), or, in the future, **rnac**

nac can optionally be multi-user aware: a single daemon can run as root and 
all clients will talk to it. Apps however are run under the uid of the user 
that added the application, and each user can only control his own apps.

# quick start

Run the nac daemon.

    nacd --daemon

Create a simple [YAML](http://en.wikipedia.org/wiki/YAML) nacfile for your app 
in the same directory where your `app.js` resides:

```yaml
command: node
args: [app.js]
env: 
  NODE_ENV: production
  PORT: 5000
```

Add the nacfile to git, clone the app on your server and run the commands:

    $ nac myapp create ~/projects/myapp/nacfile.yaml
    myapp created (/home/spion/projects/myapp/nacfile.yaml)
    $ nac myapp start
    

# running as root

You can alternatively run the daemon as root. There is no need for concern - it
will run apps under the priviledges of the user that added them (by setting 
the uid and gid). Users can only administer the apps they've added themselves.
    
    su root; nacd --daemon

Warning: the root daemon will not read the apps that were added to existing
user daemons. Users will need to re-add their apps.

# other configuration options

There are two types of configuration files in nac:

* app configuration (nacfile)
* server daemon configuration (nacd.yaml)

### nacfile

Here is a complete example nacfile:

```yaml
name: myapp
# command to execute. It has to be executable: if using a JS file directly,
# use chmod +x file.js first and add a shebang line at the top containing:
# #!/usr/bin/env node 
command: ./myapp-cluster.js
# working dir relative to the nacfile
cwd: .

# extra arguments to add: either an array
args:
  - first
  - '--other'
  - third
# OR

# alternatively you can pass a fancy object
args: 
  # long arguments are automatically prefixed with --
  longarg: value
  # one-letter arguments are prefixed with -
  s: shortarg value
  # you can add an explicit prefix if you wish
  --explicit-form: value
  -e: value
  # and you can define a list of additional arguments
  _: [even, more, arguments here]

# environment variables
env: 
  workers: 4
  NODE_ENV: production
  # clustering is best left to the app

# you can add additional scripts which will become available as commands for 
# the specific project
scripts: 
  deploy: ./scripts/deploy.sh
  report: ./scripts/statusReport.sh

# if the app dies, nac will attempt to respawn it. the respawn setting 
# controls the behavior of the respawner. The respawner will begin by
# waiting respawn.min seconds before restarting the process, then if the 
# process keeps dying it will exponentially backoff up to respawn.max seconds
# on every respawn attempt.
respawn:
  min: 0.1
  max: 30

# override options on a per-server-tag basis
servers: 
  two.myapp.com: 
    env: 
      REDIS_SERVER: one.myapp.com
  one.myapp.com:
    env: 
      # even though nac doesnt handle clustering, it
      # can pass clustering configuration via env or args 
      # on a per-server basis
      workers: 6
      REDIS_SERVER: localhost
```

### nacd.yaml

Located in `/etc`, it contains global configuration of the nac daemon.

Example `/etc/nacd.yaml` for the first server:

```yaml
tags: 
    - one.myapp.com
    - one
    - myapp-servers
```

Since this server has the tag "one.myapp.com", it will apply the specified 
config overrides for that tag

# available commands

#### create

    nac myapp create nacfile.yaml

Adds the specified app with its nacfile to the daemon.

The name specified must be unique for that server and user. If the user already
has an app running under that name, on that server, nac will complain.

#### start, stop, restart

    nac myapp [start|stop|restart]

Start/stop/restart the app `myapp` using the command, arguments and 
environment variables specified in the config file. 

#### kill

    nac myapp kill <signal>

Send the specified named signal to the app's process. Useful for user-defined 
signals such as cluster reloading

#### destroy

    nac myapp destroy

Will remove the project and its nacfile from the daemon and stop the app 
process

#### update

    nac myapp update [configpath]

Will update the configuration file. If you omit the path, `nacd` will attempt 
to reload the configuration file from the same location as previously 
specified. If you specify the config path, `nacd` will update the apps's 
configuration and update the location of the config file for that app

#### logs

    nac myapp logs

Show stdout/stderr logs for the project. Logs will be displayed in the format

[date] [time] [stdout|stderr]: content

Arguments:

* --tag <tag> - show just stdout
* --last <N> - show last N lines in log (default 100)
* --past <time> - show just the past days/hours/minutes/seconds e.g. --past 2m
* --duration <time> - show the specified duration (--past required)

### run

    nac myapp run script [args]

Run one of the scripts for the project with the specified arguments. Will
display the output of the script.

### help

    nac help [command]

Display detailed help for the command. If the command is omitted, nac will
print a list of commands.

# environment variables

When running the app or its custom script, `nac` sets the following extra 
environment variables:

* NACFILE - full path to the nacfile 
* NACDIR  - absolute working directory of the app
* NACNAME - the name of the app (e.g. myapp)

# license

MIT

![Bitdeli](https://d2weczhvl823v0.cloudfront.net/spion/triplie-ng/trend.png)
