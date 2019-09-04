/* eslint-disable import/no-extraneous-dependencies */
const chai = require('chai');
// eslint-disable-next-line import/no-unresolved
const chaiHttp = require('chai-http');
const nock = require('nock');
const app = require('../../../src/app');

chai.use(chaiHttp);

const createRequest = (prefix, method) => {
    nock(process.env.CT_URL)
        .post(`/api/v1/microservice`)
        .reply(200);

    const newRequest = chai.request(app).keepOpen();
    const oldHandler = newRequest[method];

    newRequest[method] = url => oldHandler(prefix + (url || ''));

    return newRequest;
};

module.exports = { createRequest };
