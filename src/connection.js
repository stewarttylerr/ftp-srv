const _ = require('lodash');
const uuid = require('uuid');
const Promise = require('bluebird');
const EventEmitter = require('events');

const BaseConnector = require('./connector/base');
const FileSystem = require('./fs');
const Commands = require('./commands');
const errors = require('./errors');
const DEFAULT_MESSAGE = require('./messages');

class FtpConnection extends EventEmitter {
  constructor(server, options) {
    super();
    this.server = server;
    this.id = uuid.v4();
    this.commandSocket = options.socket;
    this.log = options.log.child({id: this.id, ip: this.ip});
    this.commands = new Commands(this);
    this.transferType = 'binary';
    this.encoding = 'utf8';
    this.bufferSize = false;
    this._restByteCount = 0;
    this._secure = false;

    this.connector = new BaseConnector(this);

    this.commandSocket.on('error', (err) => {
      this.log.error(err, 'Client error');
      this.server.emit('client-error', {connection: this, context: 'commandSocket', error: err});
    });
    this.commandSocket.on('data', this._handleData.bind(this));
    this.commandSocket.on('timeout', () => {
      this.log.trace('Client timeout');
      this.close();
    });
    this.commandSocket.on('close', () => {
      if (this.connector) this.connector.end();
      if (this.commandSocket && !this.commandSocket.destroyed) this.commandSocket.destroy();
      this.removeAllListeners();
    });
  }

  _handleData(data) {
    const messages = _.compact(data.toString(this.encoding).split('\r\n'));
    this.log.trace(messages);
    return Promise.mapSeries(messages, (message) => this.commands.handle(message));
  }

  get ip() {
    try {
      return this.commandSocket ? this.commandSocket.remoteAddress : undefined;
    } catch (ex) {
      return null;
    }
  }

  get restByteCount() {
    return this._restByteCount > 0 ? this._restByteCount : undefined;
  }
  set restByteCount(rbc) {
    this._restByteCount = rbc;
  }

  get secure() {
    return this.server.isTLS || this._secure;
  }
  set secure(sec) {
    this._secure = sec;
  }

  close(code = 421, message = 'Closing connection') {
    return Promise.resolve(code)
      .then((_code) => _code && this.reply(_code, message))
      .finally(() => this.commandSocket && this.commandSocket.destroy());
  }

  login(username, password, host) {
    return Promise.try(() => {
      const loginListeners = this.server.listeners('login');
      if (!loginListeners || !loginListeners.length) {
        if (!this.server.options.anonymous) throw new errors.GeneralError('No "login" listener setup', 500);
      } else {
        return this.server.emitPromise('login', {connection: this, username, password, host});
      }
    })
    .then(({root, cwd, fs, blacklist = [], whitelist = []} = {}) => {
      this.authenticated = true;
      this.commands.blacklist = _.concat(this.commands.blacklist, blacklist);
      this.commands.whitelist = _.concat(this.commands.whitelist, whitelist);
      this.fs = fs || new FileSystem(this, {root, cwd});
    });
  }

  reply(options = {}, ...letters) {
    const satisfyParameters = () => {
      if (typeof options === 'number') options = {code: options}; // allow passing in code as first param
      if (!Array.isArray(letters)) letters = [letters];
      if (!letters.length) letters = [{}];
      return Promise.map(letters, (promise, index) => {
        return Promise.resolve(promise)
        .then((letter) => {
          if (!letter) letter = {};
          else if (typeof letter === 'string') letter = {message: letter}; // allow passing in message as first param

          if (!letter.socket) letter.socket = options.socket ? options.socket : this.commandSocket;
          if (!options.useEmptyMessage) {
            if (!letter.message) letter.message = DEFAULT_MESSAGE[options.code] || 'No information';
            if (!letter.encoding) letter.encoding = this.encoding;
          }
          return Promise.resolve(letter.message) // allow passing in a promise as a message
          .then((message) => {
            if (!options.useEmptyMessage) {
              const seperator = !options.hasOwnProperty('eol') ?
                letters.length - 1 === index ? ' ' : '-' :
                options.eol ? ' ' : '-';
              message = !letter.raw ? _.compact([letter.code || options.code, message]).join(seperator) : message;
              letter.message = message;
            } else {
              letter.message = '';
            }
            return letter;
          });
        });
      });
    };

    const processLetter = (letter) => {
      return new Promise((resolve, reject) => {
        if (letter.socket && letter.socket.writable) {
          this.log.trace({port: letter.socket.address().port, encoding: letter.encoding, message: letter.message}, 'Reply');
          letter.socket.write(letter.message + '\r\n', letter.encoding, (error) => {
            if (error) {
              this.log.error('[Process Letter] Socket Write Error', { error: error.message });
              return reject(error);
            }
            resolve();
          });
        } else {
          this.log.trace({message: letter.message}, 'Could not write message');
          reject(new errors.SocketError('Socket not writable'));
        }
      });
    };

    return satisfyParameters()
    .then((satisfiedLetters) => Promise.mapSeries(satisfiedLetters, (letter, index) => {
      return processLetter(letter, index);
    }))
    .catch((error) => {
        this.log.error('Satisfy Parameters Error', { error: error.message });
    });
  }
}
module.exports = FtpConnection;
