const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB();

const DynamoAws = () => {
  require('dotenv').config();
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'us-west-1',
  });

  const createTableParams = {
    TableName: 'DirectMailTable',
    AttributeDefinitions: [
      { AttributeName: 'filename', AttributeType: 'S' }, // filename attribute as string
    ],
    KeySchema: [
      { AttributeName: 'filename', KeyType: 'HASH' }, // partition key
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  dynamodb.createTable(createTableParams, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Table created successfully');
    }
  });
};

module.exports = DynamoAws;
