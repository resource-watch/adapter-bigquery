/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
// eslint-disable-next-line import/no-unresolved
const { createRequest } = require('./src/test-server');
const { ensureCorrectError } = require('./src/utils');
const { createMockConvertSQL, createMockBigqueryGET } = require('./src/mock');

const should = chai.should();

const query = createRequest('/api/v1/bigquery/download/', 'post');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Download test', () => {
    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Download without sql or fs parameter should return not found', async () => {
        const res = await query.post('123');
        ensureCorrectError(res, 'sql or fs required', 400);
    });

    it('Download with sql params with format json should return json result (happy case)', async () => {
        const datasetID = '123';
        const sql = 'select * from test';
        createMockConvertSQL(sql);
        createMockBigqueryGET(datasetID);
        const res = await query.post(datasetID).query({ sql, format: 'json' }).send({ dataset: { table_name: '[test:123.test]' } });
        res.status.should.equal(200);
        res.body.should.deep.equal([{ test1: 'test2' }]);
    });

    it('Download with sql params with format csv should return csv (happy case)', async () => {
        const datasetID = '123';
        const sql = 'select * from test';
        createMockConvertSQL(sql);
        createMockBigqueryGET(datasetID);
        const res = await query.post(datasetID).query({ sql, format: 'csv' }).send({ dataset: { table_name: '[test:123.test]', id: datasetID } });
        res.headers['content-type'].should.equal('text/csv');
        res.headers['content-disposition'].should.equal(`attachment; filename=${datasetID}.csv`);
        res.status.should.equal(200);
        res.text.should.equal('"test1"\n"test2"\n');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
