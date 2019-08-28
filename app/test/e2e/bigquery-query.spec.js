/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
// eslint-disable-next-line import/no-unresolved
const { createRequest } = require('./src/test-server');
const { ensureCorrectError } = require('./src/utils');
const { createMockConvertSQL, createMockBigqueryGET } = require('./src/mock');

const should = chai.should();

const query = createRequest('/api/v1/bigquery/query/', 'post');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Query tests', function () {
    this.timeout(20000);

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Query without sql or fs parameter should return not found', async () => {
        const res = await query.post('123');
        ensureCorrectError(res, 'sql or fs required', 400);
    });

    it('Query with sql params should return result (happy case)', async () => {
        const datasetID = '123';
        const sql = 'select * from test';
        createMockConvertSQL(sql);
        createMockBigqueryGET(datasetID);
        const res = await query.post(datasetID).query({ sql }).send({ dataset: { table_name: '[test:123.test]' } });

        res.status.should.equal(200);
        res.body.should.have.property('data');
        res.body.should.have.property('meta');

        const { data, meta } = res.body;
        data.should.instanceOf(Array);
        data.length.should.equal(1);
        data.should.deep.equal([{ test1: 'test2' }]);

        meta.should.instanceOf(Object).and.have.property('cloneUrl');
        meta.cloneUrl.should.instanceOf(Object);

        // eslint-disable-next-line camelcase
        const { http_method, url, body } = meta.cloneUrl;
        http_method.should.equal('POST');
        url.should.equal(`/dataset/${datasetID}/clone`);
        body.should.have.property('dataset').and.instanceOf(Object);

        const { datasetUrl, application } = body.dataset;
        application.should.deep.equal(['your', 'apps']);
        datasetUrl.should.equal(`/query/${datasetID}?sql=${encodeURI(sql).replace('*', '%2A')}`);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
