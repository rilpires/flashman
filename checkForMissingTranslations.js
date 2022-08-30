const fs = require('fs');

// Crawl directory recursively, look for files ending in "extension"
const getFilesRecursively = function(path, extension, discardExpr) {
  let files = [];
  const allFiles = fs.readdirSync(path, {withFileTypes: true});
  allFiles.forEach((f)=>{
    if (f.isDirectory()) {
      if (f.name == 'dist') return;
      if (discardExpr && f.name.includes(discardExpr)) return;
      files = files.concat(getFilesRecursively(path + '/' + f.name, extension));
    } else if (f.name.slice(-extension.length) == extension) {
      files.push(path + '/' + f.name);
    }
  });
  return files;
};

let files = getFilesRecursively('./controllers', 'js');
files = files.concat(getFilesRecursively('./models', 'js'));
files = files.concat(getFilesRecursively('./public', 'js'));
files = files.concat(getFilesRecursively('./views', 'pug'));

// Match all instances of t('key') calls
// [^A-Za-z_$] avoids false positives like test('value') or test_t('')
// (('(.+?)')|("(.+?)")) matches everything between '' or ""
// (.*?) before the ) matches arguments to the t function
// s flag here is for multiline matching - the ) might be in a different line
const tRegex = /[^A-Za-z_$]t\((('(.+?)')|("(.+?)"))(.*?)\)/gs;
// Match only the t('key' or t("key" part
const keyRegex = /t\((('(.+?)')|(("(.+?)")))/g;

let keys = [];
files.forEach((file)=>{
  const code = fs.readFileSync(file).toString();
  const matches = code.match(tRegex);
  if (!matches) return;
  matches.forEach((match)=>{
    // Remove the leading character before t
    // Then match the keyRegex
    // Then remove the leading t(' and trailing '
    const key = match.slice(1).match(keyRegex)[0].slice(3, -1);
    if (!keys.includes(key)) {
      keys.push(key);
    }
  });
});

const locales = getFilesRecursively('./public/locales', 'json', '-');
// Match all recursive keys in the json values, with format $t("key")
// [^{}] instead of . removes false positives for values in format {{value}}
const recursiveTRegex = /\$t\([^{}]+?\)/g;

let missing = {};
let unused = {};
locales.forEach((file)=>{
  let translations = JSON.parse(fs.readFileSync(file).toString());
  let recursiveKeys = [];
  missing[file] = [];
  keys.forEach((key)=>{
    // First we check if the key is missing, to avoid errors
    if (!translations[key]) {
      missing[file].push(key);
      return;
    }
    // Check for recursive keys first, store them for later
    const matches = translations[key].match(recursiveTRegex);
    if (matches) {
      matches.forEach((match)=>{
        // Remove leading $t( and trailing )
        const recursiveKey = match.slice(3, -1);
        // Handle edge case where recursive key might have already shown up in
        // regular code - don't add it again
        if (
          !keys.includes(recursiveKey) && !recursiveKeys.includes(recursiveKey)
        ) {
          recursiveKeys.push(recursiveKey);
        }
      });
    }
    // Delete the translation so it doesn't show up as unused
    delete translations[key];
  });
  // Repeat the process above for recursive keys
  recursiveKeys.forEach((key)=>{
    if (translations[key]) {
      delete translations[key];
    } else {
      missing[file].push(key);
    }
  });
  // Any keys still present in the json are guaranteed to be unused
  unused[file] = Object.keys(translations);
});

console.log('MISSING:');
console.log(missing);
console.log('UNUSED:');
console.log(unused);
console.log('DONE');
