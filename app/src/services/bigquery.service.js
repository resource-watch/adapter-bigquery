const logger = require('logger');
const BigQuery = require('@google-cloud/bigquery');

class BigQueryService {

    constructor(tableName) {
        const parts = BigQueryService.getBigQueryDatasetParams(tableName);
        const projectId = parts[0];
        this.dataset = parts[1];
        this.table = parts[2];
        this.bigquery = BigQuery({
            projectId,
            keyFilename: __dirname + '/../../../credentials.json'
        });

    }

    static getBigQueryDatasetParams(tableName) {
        const parts = tableName.substr(1, tableName.length - 2).split(':');
        return [parts[0], parts[1].split('.')[0], parts[1].split('.')[1]];
    }

    async getFields() {
        logger.debug(`Obtaining fields of dataset ${this.dataset} - ${this.table}`);
        try {
            const dataset = this.bigquery.dataset(this.dataset);
            const table = dataset.table(this.table);
            const data = await table.getMetadata();
            return data[0].schema.fields;
        } catch (err) {
            logger.error('Error obtaining fields', err);
            throw new Error('Error obtaining fields');
        }
    }

    async getCount() {
    }

    async executeQuery() {
    }

}

module.exports = BigQueryService;
