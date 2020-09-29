const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { ensureCorrectError, createMockGetDataset } = require('./utils/helpers');
const { createMockConvertSQL, createMockBigqueryGET, createMockAccessToken } = require('./utils/mock');

chai.should();

const requester = getTestServer();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Download test', () => {
    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Download from a dataset without connectorType document should fail', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId, { connectorType: 'foo' });

        const requestBody = {
            loggedUser: null
        };

        const sql = `select * from ${datasetId}`;

        const response = await requester
            .post(`/api/v1/bigquery/download/${datasetId}`)
            .query({ sql })
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Download from a without a supported provider should fail', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId, { provider: 'foo' });

        const requestBody = {
            loggedUser: null
        };

        const sql = `select * from ${datasetId}`;

        const response = await requester
            .post(`/api/v1/bigquery/download/${datasetId}`)
            .query({ sql })
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'bigquery\'');
    });

    it('Download without sql or fs parameter should return not found', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId);

        const response = await requester
            .post(`/api/v1/bigquery/download/${datasetId}`)
            .send();

        ensureCorrectError(response, 'sql or fs required', 400);
    });

    it('Download with sql params with format json should return json result (happy case)', async () => {
        const datasetId = new Date().getTime();
        const sql = 'select * from test';

        createMockGetDataset(datasetId);

        createMockAccessToken();
        createMockConvertSQL(sql);
        createMockBigqueryGET(datasetId);

        const response = await requester
            .post(`/api/v1/bigquery/download/${datasetId}`)
            .query({ sql, format: 'json' })
            .send();

        response.status.should.equal(200);
        response.body.should.deep.equal([{ test1: 'test2' }]);
    });

    it('Download with sql params with format csv should return csv (happy case)', async () => {
        const datasetId = new Date().getTime();
        const sql = 'select * from test';

        createMockGetDataset(datasetId);

        createMockAccessToken();
        createMockConvertSQL(sql);
        createMockBigqueryGET(datasetId);


        const response = await requester
            .post(`/api/v1/bigquery/download/${datasetId}`)
            .query({
                sql,
                format: 'csv'
            })
            .send();

        response.status.should.equal(200);
        response.headers['content-type'].should.equal('text/csv');
        response.headers['content-disposition'].should.equal(`attachment; filename=${datasetId}.csv`);
        response.text.should.equal('"test1"\n"test2"\n');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
