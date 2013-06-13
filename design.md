# high level overview

nac consists of 

* a client binary called `nac`
* a server binary called `nacd`

Communication between the client and the server happens through 
UNIX sockets using [dnode](http://github.com/substack/dnode), meaning
that the authentication used is also unix-socket based.

`nacd` runs as root (usually started by systemd or upstart) and 
receives commands from user-ran `nac` instances

`nacd` keeps some data in an sqlite database

# app execution model

nac will use `child_process.spawn` to spawn apps. This function
has an options argument which is going to be filled as follows:

* cwd: path to the nacfile
* env: whatever happens to be in env, extended with the env specified
  in the configuration file
* detached: false because we want the child to die if nac dies.
* uid, gid: taken from the unix socket credentials

# database model

* Table: apps
  * id - integer primary key
  * uid - app owner uid
  * name - app name
  * nacfile - path to the nacfile
  * active - true if started, false if stopped.

_Remarks_:  start sets active to true, stop sets active to false. 
If `active = true` when starting nacd, nacd will start the app. 
Otherwise the app will not be started. As a result, the start and
stop commands are preserved across daemon restarts.


* Table: logs (?)
  * appId - application id
  * event - stderr | stdout | start | stop | etc
  * timestamp - date logged
  * text - logged text


