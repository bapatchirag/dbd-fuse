const chai = require('chai');
chai.should();

describe('Init Test', function () {
    it('this is a sample test', done => {
        /* done is a callback
         * done() is to assert that test was comeplete successfully
         * done(x) will assert that test had some error and mocha will print the error
         */
        console.info('this is a sample test case output');
        done();
    });
    it('this is a sample test built to fail', done => {
        done(5);
    });
    it('this is a sample test also built to fail', done => {
        throw new Error('Another way to fail a test');
    });
});
