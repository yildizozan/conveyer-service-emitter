var amqp = require('amqplib/callback_api');

var http = require('http').createServer();
var io = require('socket.io')(http);
// io.attach(http, {
//   pingTimeout: 60000,
// });

// Websocket part
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    amqp.connect('amqp://rabbitmq', function (error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                throw error1;
            }
            var exchange = 'logs';

            channel.assertExchange(exchange, 'fanout', {
                durable: false
            });

            channel.assertQueue('', {
                exclusive: true
            }, function (error2, q) {
                if (error2) {
                    throw error2;
                }
                console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
                channel.bindQueue(q.queue, exchange, '');

                channel.consume(q.queue, function (msg) {
                    if (msg.content) {
                        console.log(" [x] %s", msg.content.toString());
                        socket.emit('new data', msg.content.toString());
                    }
                }, {
                    noAck: true
                });
            });
        });
    });

});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
