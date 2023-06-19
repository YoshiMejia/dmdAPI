const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');
const express = require('express');
require('dotenv').config();
const port = process.env.PORT;
const AWS = require('aws-sdk');
const fs = require('fs');
const { engine } = require('express-handlebars');
const convertCSV = require('./helpers/convertCSV');
const readConverted = require('./helpers/readConverted');
const downloadConverted = require('./helpers/downloadConverted');
const downloadFile = require('./helpers/downloadFile');
const deleteBucket = require('./helpers/deleteBucket');

const basePath = process.cwd();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'us-west-1',
});
const dynamodb = new AWS.DynamoDB();
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
  convertCSV(req, res, s3, dynamodb);
});

app.get('/download_converted/:folderName', (req, res) => {
  downloadConverted(req, res);
});

//currently hardcoding the folderName (line 156) to be "converted" for testing purposes
app.get('/downloadfile', async (req, res) => {
  downloadFile(req, res, s3);
});

app.delete('/clear-bucket', async (req, res) => {
  deleteBucket(req, res, s3);
});

app.listen(port, () => {
  console.log(`Now listening on port ${port}`);
});
