const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./app', (filePath) => {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('<Navbar />') && !filePath.includes('AppChrome.jsx') && !filePath.includes('Navbar.jsx')) {
      content = content.replace(/import Navbar from ['"].*?Navbar['"];?\n?/g, '');
      content = content.replace(/[ \t]*<Navbar \/>\n?/g, '');
      fs.writeFileSync(filePath, content);
      console.log('Fixed', filePath);
    }
  }
});
