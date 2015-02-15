if(false) {
  require('./not-found-file.json');
}

var out = require('./found-file.json');

console.log(out.head);
