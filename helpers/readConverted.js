const fs = require('fs');
const path = require('path');

const readConverted = (res, err, files, folderPath) => {
  if (err) {
    console.log('inside of readConverted, error:', err);
    res.status(500).json({ error: 'Error retrieving files' });
  } else {
    const fileContents = files.map((filename) => {
      const filePath = path.join(folderPath, filename);
      const relativePath = path.relative(folderPath, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      return { filename, path: relativePath, content };
    });

    res.json({ files: fileContents, folder: folderPath });
  }
};
module.exports = readConverted;
