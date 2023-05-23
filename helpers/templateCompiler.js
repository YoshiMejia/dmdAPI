const firstTemplateFn = require('./compiler_functions/firstTemplateFn');
const secondTemplateFn = require('./compiler_functions/secondTemplateFn');
const template700v2Fn = require('./compiler_functions/template700v2Fn');
const template702v2Fn = require('./compiler_functions/template702v2Fn');
const template704v2Fn = require('./compiler_functions/template704v2Fn');
const template706v2Fn = require('./compiler_functions/template706v2Fn');
const template712v2Fn = require('./compiler_functions/template712v2Fn');
const template720v2Fn = require('./compiler_functions/template720v2Fn');
const template721v2Fn = require('./compiler_functions/template721v2Fn');
const template731v2Fn = require('./compiler_functions/template731v2Fn');
const template740v2Fn = require('./compiler_functions/template740v2Fn');
const template741v2Fn = require('./compiler_functions/template741v2Fn');

const templateCompiler = (selectedTemplate, row, template) => {
  switch (selectedTemplate) {
    case 'template1':
      return firstTemplateFn(row, template);
    case 'template2':
      return secondTemplateFn(row, template);
    case '700v2':
      return template700v2Fn(row, template);
    case '702v2':
      return template702v2Fn(row, template);
    case '704v2':
      return template704v2Fn(row, template);
    case '706v2':
      return template706v2Fn(row, template);
    case '712v2':
      return template712v2Fn(row, template);
    case '720v2':
      return template720v2Fn(row, template);
    case '721v2':
      return template721v2Fn(row, template);
    case '731v2':
      return template731v2Fn(row, template);
    case '740v2':
      return template740v2Fn(row, template);
    case '741v2':
      return template741v2Fn(row, template);
    default:
      console.log('no template selected');
  }
};

module.exports = templateCompiler;
