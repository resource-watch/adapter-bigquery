const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');
const app = require('../../../src/app');

let requester;

chai.use(chaiHttp);

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


module.exports = { getTestServer };
