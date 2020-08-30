const amqp = require('amqplib/callback_api');

const http = require('http').createServer();
const io = require('socket.io')(http);
// io.attach(http, {
//   pingTimeout: 60000,
// });

const BROKER_CONN = process.env.BROKER_CONN;

let queue = []

// Websocket part
let INTERVAL;

io.sockets.on('connection', function (socket) {
    if (!INTERVAL) {
        INTERVAL = setInterval(function () {
            const message = queue.shift();
            if (message) {
                socket.broadcast.emit('new data', message);
            }
        }, 500);
    }
});

amqp.connect(BROKER_CONN, function (error0, connection) {
    if (error0) {
        throw error0;
    }

    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1;
        }

        const exchange = 'conveyer';

        channel.assertExchange(exchange, 'fanout', { durable: true });

        channel.assertQueue('clients', {}, function (error2, q) {
            if (error2) {
                throw error2;
            }

            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
            channel.bindQueue(q.queue, exchange, '');

            channel.consume(q.queue, function (msg) {
                if (msg !== null) {
                    const m = msg.content.toString();
                    console.log(" [x] %s", m);
                    console.log("Queue size: ", queue.length)
                    queue.push(m)

                    // Send acknowledge to broker
                    channel.ack(msg);
                }
            });
        });
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
