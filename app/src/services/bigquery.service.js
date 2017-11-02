
const logger = require('logger');
const config = require('config');
const BigQuery = require('@google-cloud/bigquery');
const Sql2json = require('sql2json').sql2json;
const Json2sql = require('sql2json').json2sql;
const DatasetNotValid = require('errors/datasetNotValid.error');

class BigQueryService {

    constructor(tableName, query = null) {
        const parts = this.getBigQueryDatasetParams(tableName);
        this.datasetOwner = parts[0];
        this.dataset = parts[1];
        this.table = parts[2];
        // query
        this.query = null;
        if (query) {
            const jsonQuery = new Sql2json(query).toJSON();
            jsonQuery.from = tableName;
            this.query = Json2sql.toSQL(jsonQuery);
        }
        // if not query -> fields
        const projectId = query ? config.get('gcloud.project') : this.datasetOwner;
        this.bigquery = new BigQuery({
            projectId,
            keyFilename: `${__dirname}/../../../credentials.json`
        });
    }

    getBigQueryDatasetParams(tableName) {
        if (tableName[0] !== '[' || tableName[tableName.length-1] !== ']' || tableName.indexOf(':') === -1 || tableName.indexOf('.') === -1) {
            throw new DatasetNotValid(`Invalid BigQuery TableName -> [owner:dataset.table]`);
        }
        const parts = tableName.substr(1, tableName.length - 2).split(':');
        return [parts[0], parts[1].split('.')[0], parts[1].split('.')[1]];
    }

    async getFields() {
        logger.debug(`Obtaining fields of BigQuery dataset ${this.dataset} - ${this.table}`);
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

    executeQuery() {
        // @TODO put some limitations!!
        logger.info('Query in BigQueryService', this.query);
        return this.bigquery.createQueryStream(this.query);
    }

}

module.exports = BigQueryService;
