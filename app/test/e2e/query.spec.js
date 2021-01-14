const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { ensureCorrectError, createMockGetDataset } = require('./utils/helpers');
const { createMockConvertSQL, createMockBigqueryGET, createMockAccessToken } = require('./utils/mock');

chai.should();

// const query = createRequest('/api/v1/bigquery/query/', 'post');
const requester = getTestServer();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Query tests', () => {
    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Query a dataset without connectorType document should fail', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId, { connectorType: 'foo' });

        const requestBody = {
        };

        const sql = `select * from ${datasetId}`;

        const response = await requester
            .post(`/api/v1/bigquery/query/${datasetId}`)
            .query({ sql })
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Query a without a supported provider should fail', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId, { provider: 'foo' });

        const requestBody = {
        };

        const sql = `select * from ${datasetId}`;

        const response = await requester
            .post(`/api/v1/bigquery/query/${datasetId}`)
            .query({ sql })
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'bigquery\'');
    });

    it('Query without sql or fs parameter should return not found', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId);

        const response = await requester
            .post(`/api/v1/bigquery/query/${datasetId}`)
            .send();

        ensureCorrectError(response, 'sql or fs required', 400);
    });

    it('Query with sql params should return result (happy case)', async () => {
        const datasetId = new Date().getTime();
        const sql = 'select * from test';

        createMockGetDataset(datasetId);

        createMockAccessToken();
        createMockConvertSQL(sql);
        createMockBigqueryGET(datasetId);

        const response = await requester
            .post(`/api/v1/bigquery/query/${datasetId}`)
            .query({ sql })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data');
        response.body.should.have.property('meta');

        const { data, meta } = response.body;
        data.should.instanceOf(Array);
        data.length.should.equal(1);
        data.should.deep.equal([{ test1: 'test2' }]);

        meta.should.instanceOf(Object).and.have.property('cloneUrl');
        meta.cloneUrl.should.instanceOf(Object);

        // eslint-disable-next-line camelcase
        const { http_method, url, body } = meta.cloneUrl;
        http_method.should.equal('POST');
        url.should.equal(`/dataset/${datasetId}/clone`);
        body.should.have.property('dataset').and.instanceOf(Object);

        const { datasetUrl, application } = body.dataset;
        application.should.deep.equal(['your', 'apps']);
        datasetUrl.should.equal(`/query/${datasetId}?sql=${encodeURI(sql).replace('*', '%2A')}`);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
