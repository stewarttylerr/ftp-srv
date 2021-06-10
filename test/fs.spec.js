const {expect} = require('chai');
const nodePath = require('path');
const Promise = require('bluebird');

const FileSystem = require('../src/fs');
const errors = require('../src/errors');

describe('FileSystem', function () {
  let fs;

  before(function () {
    fs = new FileSystem({}, {
      root: '/tmp/ftp-srv',
      cwd: 'file/1/2/3'
    });
  });

  describe('extend', function () {
    class FileSystemOV extends FileSystem {
      chdir() {
        throw new errors.FileSystemError('Not a valid directory');
      }
    }
    let ovFs;
    before(function () {
      ovFs = new FileSystemOV({});
    });

    it('handles error', function () {
      return Promise.try(() => ovFs.chdir())
      .catch((err) => {
        expect(err).to.be.instanceof(errors.FileSystemError);
      });
    });
  });

  describe('#_resolvePath', function () {
    it('gets correct relative path', function () {
      const result = fs._resolvePath('.');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/file/1/2/3'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv/file/1/2/3'));
    });

    it('gets correct relative path', function () {
      const result = fs._resolvePath('..');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/file/1/2'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv/file/1/2'));
    });

    it('gets correct relative path', function () {
      const result = fs._resolvePath('other');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/file/1/2/3/other'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv/file/1/2/3/other'));
    });

    it('gets correct absolute path', function () {
      const result = fs._resolvePath('/other');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/other'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv/other'));
    });

    it('cannot escape root - unix', function () {
      const result = fs._resolvePath('../../../../../../../../../../..');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv'));
    });

    it('cannot escape root - win', function () {
      const result = fs._resolvePath('.\\..\\..\\..\\..\\..\\..\\');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv'));
    });
    it('cannot escape root - backslash prefix', function () {
      const result = fs._resolvePath('\\/../../../../../../');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv'));
    });

    it('cannot escape root - win, escaped', function () {
      // eslint-disable-next-line no-useless-escape
      const result = fs._resolvePath('\/../../../../../../');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv'));
    });

    it('resolves to file', function () {
      const result = fs._resolvePath('/cool/file.txt');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal(
        nodePath.normalize('/cool/file.txt'));
      expect(result.fsPath).to.equal(
        nodePath.resolve('/tmp/ftp-srv/cool/file.txt'));
    });
  });
});
