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
const archiver = require('archiver');
const { engine } = require('express-handlebars');
const handlebars = require('handlebars');
const templateCompiler = require('./helpers/templateCompiler');
const csv = require('csv-parser');
const readConverted = require('./helpers/readConverted');
const downloadConverted = require('./helpers/downloadConverted');

const basePath = process.cwd();

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

app.use('/converted', express.static('converted')); // Serve static files in the 'converted' directory
app.use(cors());
app.use(fileUpload());

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

const convertedRouter = express.Router(); // Define a new router for showing the converted files

convertedRouter.get('/success', (req, res) => {
  fs.readdir('converted', (err, files) => {
    const folderPath = path.join(basePath, 'converted');
    readConverted(res, err, files, folderPath);
  });
});

app.use('/converted', convertedRouter);

//removed modularized convertCSV function from /convert endpoint due to HTTP HEADERS error caused by multer. at the moment this endpoint converts to CSV and also uploads to DynamoDB. Need to refactor in future.
app.post('/convert', (req, res) => {
  const data = [];
  const viewPath = 'views/layouts';
  const selectedTemplate = req.body.template;
  const sourcePath = path.join(basePath, viewPath);
  const source = fs.readFileSync(
    path.join(sourcePath, `${selectedTemplate}.hbs`),
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
      const outputPath = path.join(basePath, 'converted', outputName);
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
    const folderPath = path.join(basePath, folderName);

    const files = await fs.promises.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      await fs.promises.unlink(filePath);
    }

    res.status(200).json({ message: 'Directory cleared successfully' });
  } catch (error) {
    console.error('Error clearing directory:', error);
    res.status(500).json({ error: 'Failed to clear directory' });
  }
});

app.listen(port, () => {
  console.log(`Now listening on port ${port}`);
});
