const archiver = require('archiver');

const downloadFile = async (req, res, s3) => {
  const folderName = 'converted';
  const zipStream = archiver('zip');
  zipStream.on('error', (err) => {
    console.error('Failed to create zip file:', err);
    res.status(500).send({ error: 'Failed to create zip file.' });
  });

  res.attachment('files.zip');
  zipStream.pipe(res);

  try {
    const s3ListParams = {
      Bucket: process.env.bucket,
      Prefix: folderName + '/',
    };

    const s3ListObjects = s3.listObjectsV2(s3ListParams).promise();
    const objects = (await s3ListObjects).Contents;
    if (objects.length === 0) {
      console.log('No files found in the S3 bucket.');
      res.status(404).send({ error: 'No files found in the S3 bucket.' });
      return;
    }
    for (const object of objects) {
      const s3Params = {
        Bucket: process.env.bucket,
        Key: object.Key,
      };

      const s3Stream = s3.getObject(s3Params).createReadStream();
      zipStream.append(s3Stream, { name: object.Key });
    }

    zipStream.finalize();
  } catch (err) {
    console.error('Failed to fetch files from S3:', err);
    res.status(500).send({ error: 'Failed to fetch files from S3.' });
  }
};

module.exports = downloadFile;
