const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');
const express = require('express');
require('dotenv').config();
const port = process.env.PORT;
const AWS = require('aws-sdk');
const fs = require('fs');
const fsX = require('fs-extra');
const archiver = require('archiver');
const { engine } = require('express-handlebars');
const handlebars = require('handlebars');
const templateCompiler = require('./helpers/templateCompiler');
const csv = require('csv-parser');
const readConverted = require('./helpers/readConverted');
const downloadConverted = require('./helpers/downloadConverted');

const currentTime = new Date().toLocaleTimeString('en-US', {
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'us-west-1',
});
const dynamodb = new AWS.DynamoDB();
const currentDate = new Date().toLocaleDateString('en-US');
const s3 = new AWS.S3();

const app = express();
app.engine(
  'handlebars',
  engine({ extname: '.hbs', defaultLayout: 'template' })
);
app.set('view engine', 'handlebars');

//commenting below bc we're uploading to S3/dynamoDB now, not the public directory
// const publicUploadsPath = path.join(__dirname, 'public', 'uploads');
// app.use(express.static(publicUploadsPath));
app.use('/converted', express.static('converted')); // Serve static files in the 'converted' directory
app.use(cors());
app.use(fileUpload());

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
  //the .sendFile method needs the absolute path to the file
});

const convertedRouter = express.Router(); // Define a new router for showing the converted files

convertedRouter.get('/success', (req, res) => {
  fs.readdir('converted', (err, files) => {
    const folderPath = path.join(__dirname, 'converted');
    readConverted(res, err, files, folderPath);
  });
});

// Use the new router for the '/converted' route
app.use('/converted', convertedRouter);

//removed modularized convertCSV function from /convert endpoint due to HTTP HEADERS error caused by multer. at the moment this endpoint converts to CSV and also uploads to DynamoDB. Need to refactor in future.
app.post('/convert', (req, res) => {
  const data = [];
  const selectedTemplate = req.body.template;
  const source = fs.readFileSync(
    path.join(__dirname, 'views/layouts', `${selectedTemplate}.hbs`),
    'utf8'
  );
  let count = 0;
  const file = req.files.csv;
  const template = handlebars.compile(source);
  const convertedData = [];
  //the file content buffer is directly passed to csv-parser for processing and converted to a readable stream
  const readable = Readable.from(file.data);
  readable
    .pipe(csv())
    .on('data', (row) => {
      count++;
      const uniqueName = `${uuidv4()}`.slice(0, 6);
      const html = templateCompiler(selectedTemplate, row, template);
      convertedData.push(html);
      const outputName = `rowNum-${count + '-' + uniqueName}.html`;
      const outputPath = path.join(__dirname, 'converted', outputName);
      fs.writeFile(outputPath, html, (err) => {
        if (err) {
          console.log(err);
        } else {
          const uniqueFilename = `${uuidv4()}`;
          const fileStream = Readable.from(file.data);
          const s3UploadParams = {
            Bucket: process.env.bucket,
            Key: `uploads/${uniqueFilename}`,
            Body: fileStream,
          };
          const s3DownloadParams = {
            Bucket: process.env.bucket,
            Key: `converted/${outputName}`,
            Body: html,
          };
          s3.upload(s3UploadParams, (err, data) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error uploading CSV to S3');
            } else {
              console.log('CSV uploaded to S3 successfully');
            }
          });
          s3.upload(s3DownloadParams, (err, data) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error uploading conversion to S3');
            } else {
              console.log('conversion uploaded to S3 successfully');
            }
          });
          console.log(`File ${outputName} created successfully`);
          const params = {
            TableName: 'DirectMail',
            Item: {
              filename: { S: outputName },
              dateCreated: { S: currentDate },
              htmlContent: { S: html },
              template: { S: selectedTemplate },
            },
          };
          dynamodb.putItem(params, (err, data) => {
            if (err) {
              console.error(err);
            } else {
              console.log(
                `HTML file ${outputName} uploaded to DynamoDB successfully`
              );
            }
          });
        }
      });
      data.push(row);
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
      res.json({ convertedData });
    });
});

app.get('/download_converted/:folderName', (req, res) => {
  downloadConverted(req, res);
});

//currently hardcoding the folderName (line 156) to be "converted" for testing purposes
app.get('/downloadfile', async (req, res) => {
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
});

app.delete('/clear-bucket', async (req, res) => {
  try {
    const folderName = 'converted';

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

    const deleteParams = {
      Bucket: process.env.bucket,
      Delete: {
        Objects: objects.map((object) => ({ Key: object.Key })),
        Quiet: false,
      },
    };

    // await s3.deleteObjects(deleteParams).promise();

    // console.log('S3 bucket cleared successfully.');
    const deletePromise = s3.deleteObjects(deleteParams).promise();
    console.log('Delete Objects Promise:', deletePromise);

    const deleteResponse = await deletePromise;
    console.log('Delete Objects Response:', deleteResponse);
    if (
      deleteResponse.Deleted.length === 0 &&
      deleteResponse.Errors.length > 0
    ) {
      console.log('No files were deleted');
    } else {
      console.log('S3 bucket cleared successfully.');
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('Failed to clear the S3 bucket:', err);
    res.status(500).send({ error: 'Failed to clear the S3 bucket.' });
  }
});

app.listen(port, () => {
  console.log(`Now listening on port ${port}`);
});
