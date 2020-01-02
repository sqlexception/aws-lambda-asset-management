"use strict";

const FileData = require("./File");
const aws = require("aws-sdk");

class S3FileSystem {

    constructor() {
        this.client = new aws.S3({apiVersion: "2006-03-01"});
    }

    /**
     * Get object data from S3 bucket
     *
     * @param String bucket
     * @param String key
     * @return Promise
     */
    getObject(bucket, key) {
        return new Promise((resolve, reject) => {
            console.log("Downloading: " + key);
            key = decodeURIComponent(key.replace(/\+/g, ' '));
            this.client.getObject({Bucket: bucket, Key: key}).promise().then((data) => {
                if (data.ContentLength <= 0) {
                    reject("Empty file or directory.");
                } else {
                    resolve(new FileData(
                        key,
                        bucket,
                        data.Body,
                        {ContentType: data.ContentType, CacheControl: data.CacheControl, Metadata: data.Metadata}
                    ));
                }
            }).catch((err) => {
                reject("S3 getObject failed: " + err);
            });
        });
    }

    /**
     * Put object data to S3 bucket
     *
     * @param FileData image
     * @return Promise
     */
    putObject(image, options) {
        const params = {
            Bucket: image.bucketName,
            Key: image.fileName,
            Body: image.data,
            Metadata: Object.assign({}, image.headers.Metadata, {"img-processed": "true"}),
            ContentType: image.headers.ContentType,
            CacheControl: (options.cacheControl !== undefined) ? options.cacheControl : image.headers.CacheControl,
            ACL: image.acl || "private"
        };

        console.log("Uploading to: " + params.Key + " (" + params.Body.length + " bytes)");

        return this.client.putObject(params).promise();
    }

    /**
     * Delete object data from S3 bucket
     *
     * @param FileData image
     * @return Promise
     */
    deleteObject(image) {
        const params = {
            Bucket: image.bucketName,
            Key: image.fileName
        };

        console.log("Delete original object: " + params.Key);

        return this.client.deleteObject(params).promise();
    }
}

module.exports = new S3FileSystem();