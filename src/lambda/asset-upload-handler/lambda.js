"use strict";

const eventParser = require("./lib/EventParser");
const io = require("./lib/S3FileSystem");
const zlib = require('zlib');
const gzip = zlib.gzip;
const gzipOptions = {
    level: 9
}
const brotli = zlib.brotliCompress;
const brotliOptions = {
    mode: 0,
    quality: 11,
    lgwin: 22,
    lgblock: 0,
    enable_dictionary: true,
    enable_transforms: false,
    greedy_block_split: false,
    enable_context_modeling: false
};

const compressTypes = {
    xml: "text/xml",
    svg: "image/svg+xml",
    woff: "font/woff ",
    woff2: "font/woff2",
    json: "application/json",
    js: "application/javascript",
    css: "text/css",
    html: "text/html",
    htm: "text/html",
    shtml: "text/html"
};

//const io =  s3FileSystem();
const async = require('async');
const AWS = require('aws-sdk');
// get reference to S3 client
const s3 = new AWS.S3();
// Lambda Handler
exports.handler = (event, context, callback) => {
    try {
        let s3Object = eventParser(event, context);
        //let srcFile = io.getObject(eventRecord.bucket.name, eventRecord.object.key).catch(error => {
        //    throw error;
        //});
        console.log(s3Object);
        // Download the image from S3, transform, and upload to a different S3 bucket.
        async.waterfall([
                function download(callback) {
                    console.log('Download the image from S3 into a buffer...');
                    io.getObject(s3Object.bucket.name, s3Object.object.key)
                        .then((file) => {
                            console.log('Downloaded file "' + file.fileName + '" with mime type: "' + file.type.mime + '.');
                            callback(null, file)
                        })
                },
                function compress(file, callback) {
                    var tasks = {};
                    tasks['brotli'] = compressBrotli(file.data);
                    tasks['gzip'] = compressGzip(file.data);
                    //start batch processing of tasks
                    async.parallelLimit(tasks, 2, function (err, results) {
                        if (err) {
                            console.log('error is', err);
                            throw err;
                        } else {
                            console.log(results);
                            callback(null, file, results);
                        }
                    });
                },
                function upload(file, strings, callback) {
                    async.forEachOf(strings, function (content, type, callback) {
                        console.log('uploading type "' + type + '" ', content);
                        console.log(file);
                        s3.putObject({
                            ACL: "public-read",
                            Bucket: file.bucketName,
                            //if image is stored in folder in source bucket, create the same folder name in destination
                            // bucket
                            Key: file.fileName + (type == 'brotli' ? '.br' : '.gz'),
                            Body: content,
                            ContentType: file.type.mime,
                            //Metadata: file.headers,
                            CacheControl: 'max-age=7614000'
                        }, function (err, res) {
                            if (err) {
                                console.log('error is', err);
                                throw err;
                            } else {
                                console.log('Resp is', res);
                                callback(null);
                            }
                        });
                    }, function (err) {
                        console.log('complete!');
                        callback(null);
                    });
                }
            ],
            function (err, results) {
                console.log(null);
            }
        )
    } catch (error) {
        context.fail('Error: ' + error);
    }
};

function compressBrotli(content) {
    return function (callback) {
        brotli(content, brotliOptions, callback);
    };
}

function compressGzip(content) {
    return function (callback) {
        gzip(content, gzipOptions, callback);
    };
}