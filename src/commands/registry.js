/* eslint no-return-assign: 0 */
const commands = [
  require('./registration/abor'),
  require('./registration/allo'),
  require('./registration/appe'),
  require('./registration/auth'),
  require('./registration/cdup'),
  require('./registration/cwd'),
  require('./registration/dele'),
  require('./registration/feat'),
  require('./registration/help'),
  require('./registration/host'),
  require('./registration/list'),
  require('./registration/mdtm'),
  require('./registration/mkd'),
  require('./registration/mode'),
  require('./registration/nlst'),
  require('./registration/noop'),
  require('./registration/opts'),
  require('./registration/pass'),
  require('./registration/pasv'),
  require('./registration/port'),
  require('./registration/pwd'),
  require('./registration/quit'),
  require('./registration/rest'),
  require('./registration/retr'),
  require('./registration/rmd'),
  require('./registration/rnfr'),
  require('./registration/rnto'),
  require('./registration/site'),
  require('./registration/size'),
  require('./registration/stat'),
  require('./registration/stor'),
  require('./registration/stou'),
  require('./registration/stru'),
  require('./registration/syst'),
  require('./registration/type'),
  require('./registration/user'),
  require('./registration/pbsz'),
  require('./registration/prot'),
  require('./registration/eprt'),
  require('./registration/epsv')
];

const registry = commands.reduce((result, cmd) => {
  const aliases = Array.isArray(cmd.directive) ? cmd.directive : [cmd.directive];
  aliases.forEach((alias) => result[alias] = cmd);
  return result;
}, {});

module.exports = registry;
