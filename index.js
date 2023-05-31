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
  let count = 0;
  const uniqueFilename = `${uuidv4()}`;
  const file = req.files.csv;
  const fileStream = Readable.from(file.data);
  const s3Params = {
    Bucket: 'waconverterbucket',
    Key: `uploads/${uniqueFilename}`,
    Body: fileStream,
  };
  s3.upload(s3Params, (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error uploading file to S3');
    } else {
      console.log('File uploaded to S3 successfully');
    }
  });
  const data = [];
  const selectedTemplate = req.body.template;
  const source = fs.readFileSync(
    path.join(__dirname, 'views/layouts', `${selectedTemplate}.hbs`),
    'utf8'
  );
  const template = handlebars.compile(source);
  const convertedData = [];
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

app.listen(port, () => {
  console.log(`Now listening on port ${port}`);
});
