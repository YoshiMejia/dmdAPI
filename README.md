# dmdAPI

dmdAPI is a Node.js API designed to be used by the WAConverter Next.js project. It serves as the backend for handling CSV conversions to HTML. This API offers a set of endpoints that WAConverter makes calls to, allowing seamless conversion of CSV files to HTML format.

## Key Features

- Seamless integration with AWS CodePipeline, enabling automatic deployment to Elastic Beanstalk whenever changes are made.
- Utilizes DynamoDB as additional storage to store the converted files, ensuring easy access and retrieval.

## Target Audience

The target audience for dmdAPI is the WAC workspace, providing a convenient solution for handling CSV to HTML conversions within the workspace environment.

## Technologies Used

- Node.js
- Express.js
- AWS SDK
- Archiver
- Cors
- CSV Parser
- Dotenv
- Express Fileupload
- Express Handlebars
- FS Extra
- Handlebars
- Multer

## Project Status

dmdAPI is currently under development, with continuous improvements and enhancements being made.

## Installation

```shell
$ git clone https://github.com/YoshiMejia/dmdAPI.git
$ cd repository
$ npm install
```
