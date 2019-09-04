/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
// eslint-disable-next-line import/no-unresolved
const { createRequest } = require('./utils/test-server');
const { createMockBigqueryDataset, createMockAccessToken } = require('./utils/mock');

const should = chai.should();

const query = createRequest('/api/v1/bigquery/fields/', 'post');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Fields tests', function () {
    this.timeout(20000);

    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Getting fields should return result (happy case)', async () => {
        const datasetID = '123';
        // eslint-disable-next-line camelcase
        const table_name = '[test:123.test]';
        createMockAccessToken();
        createMockBigqueryDataset(datasetID);
        const res = await query.post(datasetID).send({ dataset: { table_name } });
        res.status.should.equal(200);
        res.body.should.have.property('fields').and.instanceOf(Array);

        const { tableName, fields } = res.body;
        tableName.should.equal(table_name);
        fields.should.deep.equal([ { name: 'test1', type: 'string' } ]);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
