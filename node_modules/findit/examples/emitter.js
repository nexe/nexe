var finder = require('findit').find(__dirname);

finder.on('directory', function (dir) {
    console.log(dir + '/');
});

finder.on('file', function (file) {
    console.log(file);
});
