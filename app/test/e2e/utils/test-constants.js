const GEOJSON_BODY = {
    type: 'geoStore',
    attributes: {
        geojson: {
            features: [{
                properties: null,
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [] }
            }],
            crs: {},
            type: 'FeatureCollection'
        },
        provider: {},
        areaHa: 0,
        bbox: [null, null, null, null],
        lock: false,
        info: { use: {} }
    }
};

const DATASET = {
    data: {
        id: '00c47f6d-13e6-4a45-8690-897bdaa2c723',
        attributes: {
            connectorUrl: 'https://wri-01.carto.com/tables/wdpa_protected_areas/table',
            table_name: 'wdpa_protected_areas'
        }
    }
};

module.exports = { GEOJSON_BODY, DATASET };
