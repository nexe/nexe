'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _gyp = require('./gyp');

var _gyp2 = _interopRequireDefault(_gyp);

var _content = require('./content');

var _content2 = _interopRequireDefault(_content);

var _thirdPartyMain = require('./third-party-main');

var _thirdPartyMain2 = _interopRequireDefault(_thirdPartyMain);

var _disableNodeCli = require('./disable-node-cli');

var _disableNodeCli2 = _interopRequireDefault(_disableNodeCli);

var _flags = require('./flags');

var _flags2 = _interopRequireDefault(_flags);

var _ico = require('./ico');

var _ico2 = _interopRequireDefault(_ico);

var _nodeRc = require('./node-rc');

var _nodeRc2 = _interopRequireDefault(_nodeRc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const patches = [_gyp2.default, _content2.default, _thirdPartyMain2.default, _disableNodeCli2.default, _flags2.default, _ico2.default, _nodeRc2.default];

exports.default = patches;