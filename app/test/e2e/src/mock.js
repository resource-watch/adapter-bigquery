// eslint-disable-next-line import/no-extraneous-dependencies
const nock = require('nock');
const config = require('config');

const createMockBigqueryDataset = datasetID => nock(`https://www.googleapis.com`)
    .get(`/bigquery/v2/projects/test/datasets/${datasetID}/tables/test`)
    .reply(200, { schema: { fields: [{ name: 'test1', type: 'string' }] } });

const createMockBigqueryGET = () => nock('https://www.googleapis.com/')
    .post(`/bigquery/v2/projects/${config.get('gcloud.project')}/queries`)
    .reply(200, { schema: { fields: [{ name: 'test1', type: 'string' }] }, rows: { f: [{ v: 'test2' }] } });

const createMockConvertSQL = sqlQuery => nock(process.env.CT_URL, { encodedQueryParams: true })
    .get(`/convert/sql2SQL?sql=${encodeURIComponent(sqlQuery)}&experimental=true`)
    .reply(200, {
        type: 'result',
        id: 'undefined',
        attributes: {
            query: 'SELECT * FROM test',
            jsonSql: { select: [{ value: '*', alias: null, type: 'literal' }], from: 'test' }
        },
        relationships: {}
    });

const createMockRegisterDataset = id => nock(process.env.CT_URL)
    .patch(`/dataset/${id}`)
    .reply(200, {});

module.exports = { createMockConvertSQL, createMockBigqueryGET, createMockBigqueryDataset, createMockRegisterDataset };
