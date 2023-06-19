const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const handlebars = require('handlebars');
const { v4: uuidv4 } = require('uuid');
const templateCompiler = require('./templateCompiler');

const basePath = process.cwd();
const currentDate = new Date().toLocaleDateString('en-US');

const convertCSV = (req, res, s3, dynamodb) => {
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
  //the file content is directly passed to csv-parser for processing and converted to a readable stream
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
          const s3UploadParams = {
            Bucket: process.env.bucket,
            Key: `uploads/${outputName}`,
            Body: readable,
          };
          const s3DownloadParams = {
            Bucket: process.env.bucket,
            Key: `converted/${outputName}`,
            Body: html,
          };
          s3.upload(s3UploadParams, (err, data) => {
            err
              ? (console.error(err),
                res.status(500).send('Error uploading CSV to S3'))
              : console.log('CSV uploaded to S3 successfully');
          }),
            s3.upload(s3DownloadParams, (err, data) => {
              err
                ? (console.error(err),
                  res.status(500).send('Error uploading conversion to S3'))
                : console.log('conversion uploaded to S3 successfully');
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
            err
              ? console.error(err)
              : console.log(
                  `HTML file ${outputName} uploaded to DynamoDB successfully`
                );
          });
        }
      });
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
      res.json({ convertedData });
    });
};
module.exports = convertCSV;
