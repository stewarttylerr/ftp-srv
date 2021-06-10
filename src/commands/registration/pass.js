module.exports = {
  directive: 'PASS',
  handler: function ({log, command} = {}) {
    if (!this.username) return this.reply(503);
    if (this.authenticated) return this.reply(202);

    // 332 : require account name (ACCT)

    const password = command.arg;
    if (!password) return this.reply(501, 'Must provide password');
    return this.login(this.username, password, this.host)
    .then(() => {
      return this.reply(230);
    })
    .catch((err) => {
      log.error(err);
      return this.reply(530, err.message || 'Authentication failed');
    });
  },
  syntax: '{{cmd}} <password>',
  description: 'Authentication password',
  flags: {
    no_auth: true
  }
};
