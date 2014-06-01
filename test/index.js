var expect = require('expect.js'),
    ultraDns = require('..');

describe('ultra-dns', function() {
  it('should say hello', function(done) {
    expect(ultraDns()).to.equal('Hello, world');
    done();
  });
});
