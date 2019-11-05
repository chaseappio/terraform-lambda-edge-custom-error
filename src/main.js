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

    if(/\.[a-zA-Z]{1,4}$/.test(request.uri)){
        callback(null, response);
        return;
    }

    if(statusCode == config.errorCode){

        const domain = cf.config.distributionDomainName;

        const uriParts = request.uri
                            .replace(/^\//,"")
                            .replace(/\/$/,"")
                            .split('/',config.pathPreserveDegree);

        config.responsePagePath = config.responsePagePath
                                            .replace(/^\//,"");
        
        let responsePagePath = '';

        if(uriParts.length > 0 ){
            responsePagePath.replace('{path}',uriParts.join('/'));
        }
        else{
            responsePagePath.replace('/{path}','')
                            .replace('{path}','')
                            .replace(/^\//,"");
        }

        responsePagePath += '/' + config.responsePagePath;


        

        const headers = { };

        const headerUserAgent = 'user-agent';

        headers[headerUserAgent] = extractHeader(request,headerUserAgent);
        
        const customResponse = await httpGet({ 
                            hostname: domain, 
                            path: responsePagePath,
                            headers : headers 
        });

        if(customResponse.statusCode >= 300){
            console.log(`Non success status code for request ${customResponse.statusCode}. hostname: ${domain}, path: ${responsePagePath}`);
        }


        let resultHeaders = wrapAndFilterHeaders(customResponse.headers);

        resultHeaders['transfer-encoding'] = response.headers['transfer-encoding'];
        resultHeaders['via'] = response.headers['via'];

        response = {
            status: config.responseCode,
            headers: resultHeaders,
            body: customResponse.body
        };
    }

    callback(null, response);
};

function extractHeader(request,headerName) {
    if(!request){
        return null;
    }

    if(!request.headers){
        return null;
    }

    if(!request.headers[headerName]){
        return null;
    }

    if(request.headers[headerName].length <= 0){
        return null;
    }

    return request.headers[headerName][0].value;
}

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
                responseHeaders[propName] = [{ key: propName, value: header }];
            }    
        }

    }

    return responseHeaders;
}