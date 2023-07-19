const nock = require('nock');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createMockRegisterDataset } = require('./utils/mock');
const { DATASET } = require('./utils/test-constants');
const { mockValidateRequestWithApiKey } = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Query register dataset tests', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Should register dataset', async () => {
        mockValidateRequestWithApiKey({});
        createMockRegisterDataset(DATASET.data.id);

        const res = await requester
            .post('/api/v1/bigquery/rest-datasets/bigquery')
            .set('x-api-key', 'api-key-test')
            .send({
                connector: {
                    connectorUrl: DATASET.data.attributes.connectorUrl,
                    tableName: DATASET.data.attributes.table_name,
                    id: DATASET.data.id,
                }
            });

        res.status.should.equal(200);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
