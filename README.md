<p align="center">
  <a href="https://github.com/autovance/ftp-srv">
    <img alt="ftp-srv" src="logo.png" width="600px"  />
  </a>
</p>


<p align="center">
  Modern, extensible FTP Server
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ftp-srv">
    <img alt="npm" src="https://img.shields.io/npm/dm/ftp-srv.svg?style=for-the-badge" />
  </a>

  <a href="https://circleci.com/gh/autovance/workflows/ftp-srv/tree/master">
    <img alt="circleci" src="https://img.shields.io/circleci/project/github/autovance/ftp-srv/master.svg?style=for-the-badge" />
  </a>
</p>

---

- [Overview](#overview)
- [Features](#features)
- [Install](#install)
- [Usage](#usage)
  - [API](#api)
  - [CLI](#cli)
  - [Events](#events)
  - [Supported Commands](#supported-commands)
  - [File System](#file-system)
- [Contributing](#contributing)
- [License](#license)

## Overview
`ftp-srv` is a modern and extensible FTP server designed to be simple yet configurable.

## Features
- Extensible [file systems](#file-system) per connection
- Passive and active transfers
- [Explicit](https://en.wikipedia.org/wiki/FTPS#Explicit) & [Implicit](https://en.wikipedia.org/wiki/FTPS#Implicit) TLS connections
- Promise based API

## Install
`npm install ftp-srv --save`

## Usage

```js
// Quick start

const FtpSrv = require('ftp-srv');
const ftpServer = new FtpSrv({ options ... });

ftpServer.on('login', (data, resolve, reject) => { ... });
...

ftpServer.listen()
.then(() => { ... });
```

## API

### `new FtpSrv({options})`
#### url
[URL string](https://nodejs.org/api/url.html#url_url_strings_and_url_objects) indicating the protocol, hostname, and port to listen on for connections.
Supported protocols:
- `ftp` Plain FTP
- `ftps` Implicit FTP over TLS

_Note:_ The hostname must be the external IP address to accept external connections. `0.0.0.0` will listen on any available hosts for server and passive connections.  
__Default:__ `"ftp://127.0.0.1:21"`

#### `pasv_url`
This **must** be the external WAN **IP address** that the FTP server is bound to. `FTP-srv` provides this IP address to the client when a `PASV` command is received in the handshake for a passive connection. Reference [PASV verb](https://cr.yp.to/ftp/retr.html#pasv).
If not provided, clients can only connect using an `Active` connection.

#### `pasv_min`
The starting port to accept passive connections.  
__Default:__ `1024`

#### `pasv_max`
The ending port to accept passive connections.  
The range is then queried for an available port to use when required.  
__Default:__ `65535`

#### `greeting`
A human readable array of lines or string to send when a client connects.  
__Default:__ `null`

#### `tls`
Node [TLS secure context object](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) used for implicit (`ftps` protocol) or explicit (`AUTH TLS`) connections.  
__Default:__ `false`

#### `anonymous`
If true, will allow clients to authenticate using the username `anonymous`, not requiring a password from the user.  
Can also set as a string which allows users to authenticate using the username provided.  
The `login` event is then sent with the provided username and `@anonymous` as the password.  
__Default:__ `false`

#### `blacklist`
Array of commands that are not allowed.  
Response code `502` is sent to clients sending one of these commands.  
__Example:__ `['RMD', 'RNFR', 'RNTO']` will not allow users to delete directories or rename any files.  
__Default:__ `[]`

#### `whitelist`
Array of commands that are only allowed.  
Response code `502` is sent to clients sending any other command.  
__Default:__ `[]`

#### `file_format`
Sets the format to use for file stat queries such as `LIST`.  
__Default:__ `"ls"`  
__Allowable values:__
  - `ls` [bin/ls format](https://cr.yp.to/ftp/list/binls.html)
  - `ep` [Easily Parsed LIST format](https://cr.yp.to/ftp/list/eplf.html)
  - `function () {}` A custom function returning a format or promise for one.
    - Only one argument is passed in: a node [file stat](https://nodejs.org/api/fs.html#fs_class_fs_stats) object with additional file `name` parameter

#### `log`
A [bunyan logger](https://github.com/trentm/node-bunyan) instance. Created by default.

#### `timeout`
Sets the timeout (in ms) after that an idle connection is closed by the server  
__Default:__ `0`

## CLI

`ftp-srv` also comes with a builtin CLI.

```bash
$ ftp-srv [url] [options]
```

```bash
$ ftp-srv ftp://0.0.0.0:9876 --root ~/Documents
```

#### `url`
Set the listening URL.

Defaults to `ftp://127.0.0.1:21`

#### `--pasv_url`
The hostname to provide a client when attempting a passive connection (`PASV`).  
If not provided, clients can only connect using an `Active` connection.

#### `--pasv_min`
The starting port to accept passive connections.  
__Default:__ `1024`

#### `--pasv_max`
The ending port to accept passive connections.  
The range is then queried for an available port to use when required.  
__Default:__ `65535`

#### `--root` / `-r`
Set the default root directory for users.

Defaults to the current directory.

#### `--credentials` / `-c`
Set the path to a json credentials file.

Format:

```js
[
  {
    "username": "...",
    "password": "...",
    "root": "..." // Root directory
  },
  ...
]
```

#### `--username`
Set the username for the only user. Do not provide an argument to allow anonymous login.

#### `--password`
Set the password for the given `username`.

#### `--read-only`
Disable write actions such as upload, delete, etc.

## Events

The `FtpSrv` class extends the [node net.Server](https://nodejs.org/api/net.html#net_class_net_server). Some custom events can be resolved or rejected, such as `login`.

### `virtualhost`
```js
ftpServer.on('virtualhost', ({connection, host}, resolve, reject) => { ... })
```

Occurs when client sets hostname using the `HOST` command before authentication. If you attach a listener to this event, you can make the server [RFC 7151](https://tools.ietf
.org/html/rfc7151) compliant. Here you can setup an environment for different virtualhosts. Note that the client may change the host multiple times before a successful authentication, the last successful attempt will be saved in that case.

`connection` [client class object](src/connection.js)  
`host` string of hostname from `HOST` command  
`resolve` takes an object of arguments:  
- `motd`
  - Array of lines from the welcome message of the virtualhost.
  - The last line will always be _Host accepted_ regardless of this argument.
- `anonymous`
  - Set to a boolean to enable/disable anonymous login on this host

`reject` takes an error object

### `login`
```js
ftpServer.on('login', ({connection, username, password, host}, resolve, reject) => { ... });
```

Occurs when a client is attempting to login. Here you can resolve the login request by username and password.

`connection` [client class object](src/connection.js)  
`username` string of username from `USER` command  
`password` string of password from `PASS` command  
`host` string of hostname from `HOST` command, if issued before login  
`resolve` takes an object of arguments:  
- `fs`
  - Set a custom file system class for this connection to use.
  - See [File System](#file-system) for implementation details.
- `root`
  - If `fs` is not provided, this will set the root directory for the connection.
  - The user cannot traverse lower than this directory.
- `cwd`
  - If `fs` is not provided, will set the starting directory for the connection
  - This is relative to the `root` directory.
- `blacklist`
  - Commands that are forbidden for only this connection
- `whitelist`
  - If set, this connection will only be able to use the provided commands

`reject` takes an error object

### `client-error`
```js
ftpServer.on('client-error', ({connection, context, error}) => { ... });
```

Occurs when an error arises in the client connection.

`connection` [client class object](src/connection.js)  
`context` string of where the error occurred  
`error` error object

### `RETR`
```js
connection.on('RETR', (error, filePath) => { ... });
```

Occurs when a file is downloaded.

`error` if successful, will be `null`  
`filePath` location to which file was downloaded

### `STOR`
```js
connection.on('STOR', (error, fileName) => { ... });
```

Occurs when a file is uploaded.

`error` if successful, will be `null`  
`fileName` name of the file that was uploaded

### `RNTO`
```js
connection.on('RNTO', (error, fileName) => { ... });
```

Occurs when a file is renamed.

`error` if successful, will be `null`  
`fileName` name of the file that was renamed

## Supported Commands

See the [command registry](src/commands/registration) for a list of all implemented FTP commands.

## File System
The default [file system](src/fs.js) can be overwritten to use your own implementation.  
This can allow for virtual file systems, and more.  
Each connection can set it's own file system based on the user.  

The default file system is exported and can be extended as needed:  
```js
const {FtpSrv, FileSystem} = require('ftp-srv');

class MyFileSystem extends FileSystem {
  constructor() {
    super(...arguments);
  }

  get(fileName) {
    ...
  }
}
```

Custom file systems can implement the following variables depending on the developers needs:

### Methods
#### [`currentDirectory()`](src/fs.js#L40)
Returns a string of the current working directory  
__Used in:__ `PWD`

#### [`get(fileName)`](src/fs.js#L44)
Returns a file stat object of file or directory  
__Used in:__ `LIST`, `NLST`, `STAT`, `SIZE`, `RNFR`, `MDTM`

#### [`list(path)`](src/fs.js#L50)
Returns array of file and directory stat objects  
__Used in:__ `LIST`, `NLST`, `STAT`

#### [`chdir(path)`](src/fs.js#L67)
Returns new directory relative to current directory  
__Used in:__ `CWD`, `CDUP`

#### [`mkdir(path)`](src/fs.js#L114)
Returns a path to a newly created directory  
__Used in:__ `MKD`

#### [`write(fileName, {append, start})`](src/fs.js#L79)
Returns a writable stream  
Options:  
 `append` if true, append to existing file  
 `start` if set, specifies the byte offset to write to  
__Used in:__ `STOR`, `APPE`

#### [`read(fileName, {start})`](src/fs.js#L90)
Returns a readable stream  
Options:  
 `start` if set, specifies the byte offset to read from  
__Used in:__ `RETR`

#### [`delete(path)`](src/fs.js#L105)
Delete a file or directory  
__Used in:__ `DELE`

#### [`rename(from, to)`](src/fs.js#L120)
Renames a file or directory  
__Used in:__ `RNFR`, `RNTO`

#### [`chmod(path)`](src/fs.js#L126)
Modifies a file or directory's permissions  
__Used in:__ `SITE CHMOD`

#### [`getUniqueName()`](src/fs.js#L131)
Returns a unique file name to write to  
__Used in:__ `STOU`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributors

- [OzairP](https://github.com/OzairP)
- [TimLuq](https://github.com/TimLuq)
- [crabl](https://github.com/crabl)
- [hirviid](https://github.com/hirviid)
- [DiegoRBaquero](https://github.com/DiegoRBaquero)
- [edin-m](https://github.com/edin-m)
- [voxsoftware](https://github.com/voxsoftware)
- [jorinvo](https://github.com/jorinvo)
- [Johnnyrook777](https://github.com/Johnnyrook777)
- [qchar](https://github.com/qchar)
- [mikejestes](https://github.com/mikejestes)
- [pkeuter](https://github.com/pkeuter)
- [qiansc](https://github.com/qiansc)
- [broofa](https://github.com/broofa)
- [lafin](https://github.com/lafin)
- [alancnet](https://github.com/alancnet)
- [zgwit](https://github.com/zgwit)

## License

This software is licensed under the MIT Licence. See [LICENSE](LICENSE).

## References

- [https://cr.yp.to/ftp.html](https://cr.yp.to/ftp.html)
