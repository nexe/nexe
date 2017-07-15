var zmq = require('zmq')
var pub = zmq.socket('pub')

pub.bindSync('tcp://127.0.0.1:3000')
console.log('Publisher bound to port 3000')

setInterval(function(){
  console.log('sending a multipart message envelope')
  pub.send(['kitty cats', 'meow!'])
}, 2500)
console.log('global', global.require.main)
var sub = zmq.socket('sub')
sub.connect('tcp://127.0.0.1:3000')
sub.subscribe('kitty cats')
console.log('Subscriber connected to port 3000')

sub.on('message', function(topic, message) {
  console.log('received a message related to:', topic.toString(), 'containing message:', message.toString())
})
