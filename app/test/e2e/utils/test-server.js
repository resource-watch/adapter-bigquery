const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');
const app = require('../../../src/app');

let requester;

chai.use(chaiHttp);

const createRequest = (prefix, method) => {
    nock(process.env.CT_URL)
        .post(`/api/v1/microservice`)
        .reply(200);

    const newRequest = chai.request(app).keepOpen();
    const oldHandler = newRequest[method];

    newRequest[method] = (url) => oldHandler(prefix + (url || ''));

    return newRequest;
};

const getTestServer = () => {
    if (requester) {
        return requester;
    }

    nock(`${process.env.CT_URL}`)
        .post(`/api/v1/microservice`)
        .reply(200);

    requester = chai.request(app).keepOpen();

    return requester;
};


module.exports = { createRequest, getTestServer };
