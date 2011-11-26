var beanpole = require('../../lib/node');

beanpole.require(['hook.core','hook.http.mesh']).require(__dirname + '/beans').push('init');