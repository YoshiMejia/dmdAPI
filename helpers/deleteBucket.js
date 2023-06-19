const fs = require('fs');
const path = require('path');
const basePath = process.cwd();

const deleteBucket = async (req, res) => {
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
};

module.exports = deleteBucket;
