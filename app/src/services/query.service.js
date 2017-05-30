const logger = require('logger');
const BigQueryService = require('services/bigquery.service');
const json2csv = require('json2csv');

class QueryService {

    constructor(sql, dataset, passthrough, cloneUrl, download, downloadType) {
        this.sql = sql;
        this.dataset = dataset;
        this.passthrough = passthrough;
        this.cloneUrl = cloneUrl;
        this.download = download;
        this.downloadType = downloadType;
        this.timeout = false;
        this.timeoutFunc = setTimeout(() => { this.timeout = true; }, 60000);
    }

    convertObject(data) {
        if (this.download && this.downloadType === 'csv') {
            return `${json2csv({
                data,
                hasCSVColumnTitle: this.first
            })}\n`;
        }
        return `${!this.first ? ',' : ''}${JSON.stringify(data)}`;

    }

    async writeRequest(bigQueryStream) {
        return new Promise((resolve, reject) => {
            bigQueryStream
                .on('data', (row) => {
                    this.passthrough.write(this.convertObject(row));
                    this.first = false;
                    if (this.timeout) {
                        this.end();
                        resolve();
                    }
                })
                .on('end', () => resolve())
                .on('error', (error) => reject(error));
        });
    }

    async execute() {
        logger.info('Executing query');
        this.first = true;

        if (!this.download) {
            this.passthrough.write(`{"data":[`);
        } else if (this.download) {
            if (this.downloadType !== 'csv') {
                this.passthrough.write(`[`);
            }
        }

        const bigQueryService = new BigQueryService(this.dataset.tableName, this.sql);
        await this.writeRequest(bigQueryService.executeQuery());

        if (this.timeout) {
            this.passthrough.end();
            throw new Error('Timeout exceeded');
        }
        clearTimeout(this.timeoutFunc);
        const meta = {
            cloneUrl: this.cloneUrl
        };

        if (!this.download) {
            this.passthrough.write(`], "meta": ${JSON.stringify(meta)} }`);
        } else if (this.download) {
            if (this.downloadType !== 'csv') {
                this.passthrough.write(`]`);
            }
        }
        logger.debug('Finished');
        this.passthrough.end();
    }

}

module.exports = QueryService;
