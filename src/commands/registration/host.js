module.exports = {
  directive: 'HOST',
  handler: function ({log, command} = {}) {
    if (this.authenticated) return this.reply(503, 'Already logged in');

    const host = command.arg;
    if (!host) return this.reply(501, 'Must provide hostname');

    const virtualhostListeners = this.server.listeners('virtualhost');
    if (!virtualhostListeners || virtualhostListeners.length == 0) {
      return this.reply(501, 'This server does not handle virtualhost changes');
    } else {
      return this.server.emitPromise('virtualhost', {connection: this, host}).then(
        ({motd = [], anonymous}) => {
          this.host = host
          if (anonymous !== undefined) this._vh_anonymous = anonymous
          this.reply(220, 'Host accepted', ...motd)
        },
        (err) => {
          log.error(err)
          return this.reply(err.code || 504, err.message || (!err.code && 'Host rejected'))
        }
      );
    }
  },
  syntax: '{{cmd}} <hostname>',
  description: 'Virtual host',
  flags: {
    no_auth: true
  }
};
