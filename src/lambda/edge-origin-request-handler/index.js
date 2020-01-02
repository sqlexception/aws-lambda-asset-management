'use strict';

exports.handler = async function(event, context, callback) {
    const response = event.Records[0].cf.response;
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    function endsWithAny(suffixes, string) {
        for (let suffix of suffixes) {
            if(string.endsWith(suffix))
                return true;
        }
        return false;
    }

    if (headers && endsWithAny(['.css', 'js', '.svg', '.html'], request.uri)){
        let gz = false;
        let br = false;

        const acceptEncoding = headers['accept-encoding'];
        if (acceptEncoding) {
            for (let i = 0; i < acceptEncoding.length; i++) {
                const value = acceptEncoding[i].value;
                const bits = value.split(/\s*,\s*/);
                if (bits.indexOf('br') !== -1) {
                    br = true;
                    console.log('brotli')
                    break;
                } else if (bits.indexOf('gzip') !== -1) {
                    gz = true;
                    console.log('gzip')
                    break;
                }
            }
        }

        // If br is supported use .br sufffix, .gz for gzip :)
        //if (br) request.uri += '.br';
        //else if (gz) request.uri += '.gz';
    }
    // console.log(JSON.stringify(event));
    // console.log(JSON.stringify(response));
    // console.log(JSON.stringify(request));
    // response.headers = [
    //     { key: "x-lambda", value: "jipp" }
    // ];
    callback(null, response);
};