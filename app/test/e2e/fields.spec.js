const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createMockBigqueryDataset, createMockAccessToken } = require('./utils/mock');
const { createMockGetDataset } = require('./utils/helpers');

chai.should();

const requester = getTestServer();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Fields tests', () => {

    before(async () => {
        nock.cleanAll();

        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
    });

    it('Getting the fields for a dataset without connectorType document should fail', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId, { connectorType: 'foo' });

        const requestBody = {
        };

        const response = await requester
            .post(`/api/v1/bigquery/fields/${datasetId}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with connectorType \'rest\'');
    });

    it('Getting the fields for a dataset without a supported provider should fail', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId, { provider: 'foo' });

        const requestBody = {
        };

        const response = await requester
            .post(`/api/v1/bigquery/fields/${datasetId}`)
            .send(requestBody);

        response.status.should.equal(422);
        response.body.should.have.property('errors').and.be.an('array').and.have.lengthOf(1);
        response.body.errors[0].detail.should.include('This operation is only supported for datasets with provider \'bigquery\'');
    });

    it('Getting fields should return result (happy case)', async () => {
        const datasetId = new Date().getTime();

        createMockGetDataset(datasetId);

        createMockAccessToken();
        createMockBigqueryDataset();

        const response = await requester
            .post(`/api/v1/bigquery/fields/${datasetId}`)
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('fields').and.instanceOf(Array);

        response.body.tableName.should.equal('[bigquery-public-data:ghcn_m.ghcnm_tmax]');
        response.body.fields.should.deep.equal([{ name: 'test1', type: 'string' }]);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
