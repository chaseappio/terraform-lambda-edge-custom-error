'use strict';
const http = require('https');
let path = require('path');
let {readFileSync} = require('fs');

const params = path.resolve('params.json');
const configString = readFileSync(params).toString();
const config = JSON.parse(configString);

exports.handler = async (event, context, callback) => {

    const cf = event.Records[0].cf;
    let response = cf.response;
    const request = cf.request;
    const statusCode = response.status;

    if(statusCode == config.errorCode){

        const domain = cf.config.distributionDomainName;
        const uriParts = request.uri
                            .replace(/^\//,"")
                            .replace(/\/$/,"")
                            .split('/',config.pathPreserveDegree);

        config.responsePagePath = config.responsePagePath.replace(/^\//,"")
        
        let responsePagePath = ''
        if(uriParts.length > 0 ){
            responsePagePath += '/' + uriParts;
        }
        responsePagePath += '/' + config.responsePagePath;

        const headers = { };

        headers['user-agent'] = request.headers['user-agent'].value;

        const customResponse = await httpGet({ 
                            hostname: domain, 
                            path: responsePagePath 
        });

        if(customResponse.statusCode >= 300){
            console.log(`Non success status code for request ${customResponse.statusCode}. hostname: ${hostname}, path: ${path}`);
        }

        response = {
            status: config.responseCode,
            headers: wrapAndFilterHeaders(customResponse.headers),
            body: customResponse.body
        };

        response.status = config.responseCode;
    }

    callback(null, response);
};


function httpGet(params) {
    return new Promise((resolve, reject) => {
        http.get(params, (resp) => {
            let result = {
                headers: resp.headers,
                body: '',
                statusCode: resp.statusCode
            };
            resp.on('data', (chunk) => { result.body += chunk; });
            resp.on('end', () => { resolve(result); });
        }).on('error', (err) => {
            console.log(`Couldn't fetch ${params.hostname}${params.path} : ${err.message}`);
            reject(err, null);
        });
    });
}


function wrapAndFilterHeaders(headers){
    const allowedHeaders = [
        'content-type',
        'content-length',
        'last-modified',
        'date',
        'etag',
        'cache-control'
    ];

    const responseHeaders = {};

    if(!headers){
        return responseHeaders;
    }

    for(var propName in headers) {
        // only include allowed headers
        if(allowedHeaders.includes(propName.toLowerCase())){
            var header = headers[propName];

            if (Array.isArray(header)){
                // assume already 'wrapped' format
                responseHeaders[propName] = header;
            } else {
                // fix to required format
                responseHeaders[propName] = [{ value: header }];
            }    
        }

    }

    return responseHeaders;
}