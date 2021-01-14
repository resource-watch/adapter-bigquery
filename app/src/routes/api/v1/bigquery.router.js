const Router = require('koa-router');
const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const BigQueryService = require('services/bigquery.service');
const QueryService = require('services/query.service');
const FieldSerializer = require('serializers/field.serializer');
const passThrough = require('stream').PassThrough;
const ErrorSerializer = require('serializers/error.serializer');
const DatasetMiddleware = require('middleware/dataset.middleware');

const router = new Router({
    prefix: '/bigquery',
});

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

class BigQueryRouter {

    static getCloneUrl(url, idDataset) {
        return {
            http_method: 'POST',
            url: `/dataset/${idDataset}/clone`,
            body: {
                dataset: {
                    datasetUrl: url.replace('/bigquery', ''),
                    application: ['your', 'apps']
                }
            }
        };
    }

    static async query(ctx) {
        ctx.set('Content-type', 'application/json');
        const { format } = ctx.query;
        const cloneUrl = BigQueryRouter.getCloneUrl(ctx.request.url, ctx.params.dataset);
        try {
            ctx.body = passThrough();
            const queryService = new QueryService(ctx.query.sql, ctx.request.body.dataset, ctx.body, cloneUrl, false, format);
            queryService.execute();
        } catch (err) {
            ctx.body = ErrorSerializer.serializeError(err.statusCode || 500, err.error && err.error.error ? err.error.error[0] : err.message);
            ctx.status = 500;
            ctx.body.end();
        }
    }

    static async download(ctx) {
        try {
            ctx.body = passThrough();
            const format = ctx.query.format ? ctx.query.format : 'csv';
            let mimetype;
            switch (format) {

                case 'csv':
                    mimetype = 'text/csv';
                    break;
                case 'json':
                default:
                    mimetype = 'application/json';
                    break;

            }

            const cloneUrl = BigQueryRouter.getCloneUrl(ctx.request.url, ctx.params.dataset);
            const queryService = await new QueryService(ctx.query.sql, ctx.request.body.dataset, ctx.body, cloneUrl, true, format);
            ctx.set('Content-disposition', `attachment; filename=${ctx.request.body.dataset.id}.${format}`);
            ctx.set('Content-type', mimetype);
            queryService.execute();
        } catch (err) {
            ctx.body = ErrorSerializer.serializeError(err.statusCode || 500, err.error && err.error.error ? err.error.error[0] : err.message);
            ctx.status = 500;
        }
    }

    static async fields(ctx) {
        logger.info(`Obtaining fields of dataset ${ctx.request.body.dataset.id}`);
        const bigQueryService = new BigQueryService(ctx.request.body.dataset.tableName);
        const fields = await bigQueryService.getFields();
        ctx.body = FieldSerializer.serialize(fields, ctx.request.body.dataset.tableName);
    }

    static async registerDataset(ctx) {
        logger.info('Registering dataset with data', ctx.request.body.connector);
        try {
            const bigQueryService = new BigQueryService(ctx.request.body.connector.tableName);
            await bigQueryService.getFields();
            await RWAPIMicroservice.requestToMicroservice({
                method: 'PATCH',
                uri: `/dataset/${ctx.request.body.connector.id}`,
                body: {
                    dataset: {
                        status: 1
                    }
                },
                json: true
            });
        } catch (e) {
            await RWAPIMicroservice.requestToMicroservice({
                method: 'PATCH',
                uri: `/dataset/${ctx.request.body.connector.id}`,
                body: {
                    dataset: {
                        status: 2,
                        errorMessage: `${e.name} - ${e.message}`
                    }
                },
                json: true
            });
        }
        ctx.body = {};
    }

}

const toSQLMiddleware = async (ctx, next) => {
    const options = {
        method: 'GET',
        json: true,
        resolveWithFullResponse: true,
        simple: false
    };
    if (!ctx.query.sql && !ctx.request.body.sql && !ctx.query.outFields && !ctx.query.outStatistics) {
        ctx.throw(400, 'sql or fs required');
        return;
    }
    // remove it in the future when join is implemented in converter
    let sql = null;
    if (ctx.query.sql || ctx.request.body.sql) {
        logger.debug('Checking sql correct');
        const params = { ...ctx.query, ...ctx.request.body };
        sql = params.sql;
        options.uri = `/convert/sql2SQL?sql=${params.sql}&experimental=true`;
        if (params.geostore) {
            options.uri += `&geostore=${params.geostore}`;
        }
        if (params.geojson) {
            options.body = {
                geojson: params.geojson
            };
            options.method = 'POST';
        }

    } else {
        logger.debug('Obtaining sql from featureService');
        const fs = { ...ctx.request.body };
        delete fs.dataset;
        const query = serializeObjToQuery(ctx.request.query);
        const body = fs;
        const resultQuery = { ...query };

        if (resultQuery) {
            options.uri = `/convert/fs2SQL${resultQuery}&tableName=${ctx.request.body.dataset.tableName}`;
        } else {
            options.uri = `/convert/fs2SQL?tableName=${ctx.request.body.dataset.tableName}`;
        }
        options.body = body;
        options.method = 'POST';
    }

    try {
        const result = await RWAPIMicroservice.requestToMicroservice(options);

        if (result.statusCode === 204 || result.statusCode === 200) {
            // ctx.query.sql = result.body.data.attributes.query;

            // remove it in the future when join is implemented in converter
            ctx.query.sql = sql;
            logger.info('Query', ctx.query.sql);
            await next();
        } else if (result.statusCode === 400) {
            ctx.status = result.statusCode;
            ctx.body = result.body;
        } else {
            ctx.throw(result.statusCode, result.body);
        }

    } catch (e) {
        if (e.errors && e.errors.length > 0 && e.errors[0].status >= 400 && e.errors[0].status < 500) {
            ctx.status = e.errors[0].status;
            ctx.body = e;
        } else {
            throw e;
        }
    }
};

router.post('/query/:dataset', DatasetMiddleware.getDatasetById, toSQLMiddleware, BigQueryRouter.query);
router.post('/download/:dataset', DatasetMiddleware.getDatasetById, toSQLMiddleware, BigQueryRouter.download);
router.post('/fields/:dataset', DatasetMiddleware.getDatasetById, BigQueryRouter.fields);
router.post('/rest-datasets/bigquery', BigQueryRouter.registerDataset);

module.exports = router;
