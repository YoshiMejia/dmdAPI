const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
// const fsX = require('fs-extra');

const downloadConverted = (req, res) => {
  const folderName = req.query.folderName || 'converted';
  const folderPath = path.join(path.resolve(__dirname, '..'), folderName);
  const zipName = folderName + '.zip';
  const zipPath = path.resolve(__dirname, '..', zipName);
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = fs.createWriteStream(zipPath);

  archive.pipe(output);

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.log('inside of downloadConverted line 18, error:', err);
      return res.status(500).send('Error reading directory');
    }

    files.forEach((filename) => {
      const filePath = path.join(folderPath, filename);
      archive.file(filePath, { name: filename });
    });

    archive.finalize();
  });

  output.on('close', () => {
    console.log('ZIP file created successfully');
    res.download(zipPath, (err) => {
      if (err) {
        console.log('inside of downloadConverted line 34, error:', err);
        res.status(500).send('Error sending file');
      } else {
        console.log('ZIP file sent successfully');
        fs.unlink(zipPath, (err) => {
          if (err) {
            console.error(
              'inside of downloadConverted line 40 Error deleting ZIP file:',
              err
            );
          } else {
            console.log('ZIP file deleted successfully');
            // commenting out below code so that the converted directory only gets cleared out once the user specifically chooses to. The below automatically clears the directory out upon each download.
            // fsX
            //   .emptyDir(folderPath)
            //   .then(() => console.log('Converted Folder cleared successfully'))
            //   .catch((err) =>
            //     console.error('Error clearing Converted Folder:', err)
            //   );
          }
        });
      }
    });
  });

  archive.on('error', (err) => {
    console.error(err);
    res.status(500).send('Error creating ZIP file');
  });
};

module.exports = downloadConverted;
