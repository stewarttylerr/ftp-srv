const Promise = require('bluebird');

module.exports = {
  directive: 'RETR',
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.read) return this.reply(402, 'Not supported by file system');

    const filePath = command.arg;
    return this.fs.read(filePath, {start: this.restByteCount})
      .tap(() => this.reply(150))
      .tap(() => this.commandSocket.pause())
      .then((fsResponse) => {
        return this.connector.waitForConnection()
        .then(() => {
          let {stream, clientPath} = fsResponse;
          if (!stream && !clientPath) {
            stream = fsResponse;
            clientPath = filePath;
          }
          const serverPath = stream.path || filePath;

          const destroyConnection = (connection, reject) => (err) => {
            if (connection) connection.destroy(err);
            reject(err);
          };

          const eventsPromise = new Promise((resolve, reject) => {
            stream.on('data', (data) => {
              if (stream) stream.pause();
              if (this.connector.socket) {
                this.connector.socket.write(data, () => stream && stream.resume());
              }
            });
            stream.once('end', () => resolve());
            stream.once('error', destroyConnection(this.connector.socket, reject));

            this.connector.socket.once('error', destroyConnection(stream, reject));
          });

          this.restByteCount = 0;

          return Promise.try(() => stream.resume() && this.connector.socket.resume())
            .then(() => eventsPromise)
            .tap(() => this.emit('RETR', null, serverPath))
            .then(() => this.reply(226, clientPath))
            .finally(() => stream.destroy && stream.destroy());
        })
        .catch(Promise.TimeoutError, (err) => {
          log.error(err);
          return this.reply(425, 'No connection established');
        })
        .catch((err) => {
          log.error(err);
          this.emit('RETR', err);
          return this.reply(551, err.message);
        })
        .finally(() => {
          this.connector.end();
          this.commandSocket.resume();
        });
    })
  },
  syntax: '{{cmd}} <path>',
  description: 'Retrieve a copy of the file'
};
