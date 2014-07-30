var mdeps = require("module-deps"),
through   = require("through"),
async     = require("async");

function bundle (input, complete) {

  async.waterfall([

    /**
     */

    function resolveDeps () {

      var deps = [];

      mdeps(input).pipe(through(function (chunk) {
        deps.push(chunk);
      }, function () {

        for (var i = deps.length; i--;) {
          console.log(deps);
        }

      }));
    }
  ]);
}

module.exports = bundle;