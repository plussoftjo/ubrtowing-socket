/** Call Express & Bodyparser for request data body */
var express = require('express');
var bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk')
// Create the app from the express method
var app = express();
// Make http for create Connection server
var http = require('http').createServer(app);
// Socket io 
var io = require('socket.io')(http);
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
var urlencodedParser = bodyParser.urlencoded({ extended: false })
// parse application/json
app.use(bodyParser.json());
app.use(express.static('public'))
/** Twilio */
const accountSid = 'AC6a4b1043ffbc5bdd1efd4cdf559a7432';
const authToken = '542338552897b7b9816bfa4700573d84';
const client = require('twilio')(accountSid, authToken);


/** expo */
// Create a new Expo SDK client


/** Stripe */
var stripe = require('stripe')('sk_test_TXq87UJByt7JNTxO6T2kjgp300b5Ss6QZN');


// JUST AN TEST 
app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});


// Get Stripe Token Middleware
app.post('/stripe_get_token', urlencodedParser,function(req, res){
  let data = req.body;
  stripe.tokens.create(
    {
      card: {
        number: data.number,
        exp_month: data.month,
        exp_year: data.year,
        cvc: data.cvc,
      },
    },
    function(err, token) {
      console.log(err);
      res.send(token);
    }
  );
});
app.post('/stripe_charge',urlencodedParser,function(req,res) {
  let data = req.body;
  try {
    stripe.customers
      .create({
        name: data.name,
        email: 'ahmed.altommy@gmail.com',
        source: data.token
      })
      .then(customer =>
        stripe.charges.create({
          amount: 100 * 100,
          currency: "usd",
          customer: customer.id
        })
      )
      .then(() => res.send('<h1>Hello world</h1>'))
      .catch(err => res.send(err));
  } catch (err) {
    res.send(err);
  }
})
app.post('/send_notification_request_to_driver',urlencodedParser,function(req,res) {
  let data = req.body.values;
  let expo = new Expo();
  let messages = [];
  if (!Expo.isExpoPushToken(data.notifiaction_token)) {
    console.error(`Push token ${data.notifiaction_token}is not a valid Expo push token`);
  }
  messages.push({
    to: data.notifiaction_token,
    title:'New request',
    sound: 'default',
    body: 'You have new request check it out',
    data: {data:data},
  })
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }
  })();
  let receiptIds = [];
  for (let ticket of tickets) {
    if (ticket.id) {
      receiptIds.push(ticket.id);
    }
  }
let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
(async () => {
  for (let chunk of receiptIdChunks) {
    try {
      let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (let receipt of receipts) {
        if (receipt.status === 'ok') {
          continue;
        } else if (receipt.status === 'error') {
          console.error(`There was an error sending a notification: ${receipt.message}`);
          if (receipt.details && receipt.details.error) {
            console.error(`The error code is ${receipt.details.error}`);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
})();
res.send('<h1>Sended</h1>');
});

app.post('/send_notification_aprove_to_client',urlencodedParser,function(req,res) {
  let data = req.body.values;
  let expo = new Expo();
  let messages = [];
  if (!Expo.isExpoPushToken(data.notifiaction_token)) {
    console.error(`Push token ${data.notifiaction_token}is not a valid Expo push token`);
  }
  messages.push({
    to: data.notifiaction_token,
    title:'Request Approve',
    sound: 'default',
    body: 'You have approve from the driver check it out',
    data: {data:data},
  })
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }
  })();
  let receiptIds = [];
for (let ticket of tickets) {
  if (ticket.id) {
    receiptIds.push(ticket.id);
  }
}
let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
(async () => {
  for (let chunk of receiptIdChunks) {
    try {
      let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      console.log(receipts);
      for (let receipt of receipts) {
        if (receipt.status === 'ok') {
          continue;
        } else if (receipt.status === 'error') {
          console.error(`There was an error sending a notification: ${receipt.message}`);
          if (receipt.details && receipt.details.error) {
            console.error(`The error code is ${receipt.details.error}`);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
})();
res.send('<h1>Sended</h1>');
});

app.post('/send_sms',urlencodedParser, function(req, res){
  client.messages
  .create({
     body: 'UBR-Towing - code:'+req.body.code,
     from: '+12242057959',
     to: req.body.number
   })
  .then(message => res.send('<h1>Sended</h1>'));
});
/**
 * Socket Function 
 *  connection method
 */
io.on('connection', function(socket){
  /** Subscripe user to room
   * Driver Subscripe the driver for current id
   * Client subscripe to the nerist driver id
   */
  socket.on('subscripe',function(room) {
    console.log('subscripe user to room : ' + room)
    socket.join(room);
  });
  socket.on('unsubscripe',function(data) {
    console.log('leave room : ' + data.room)
    socket.leave(data.room);
  });
  /**
   * Text
   */
  socket.on('request_driver',function(data) {
    io.to(data.room).emit('send_request_to_driver',data);
  });
  socket.on('send_approve_from_driver',function(data) {
    io.to(data.room).emit('send_approve_to_client',data);
  });
  socket.on('send_start_service_from_the_driver',function(data){
    io.to(data.room).emit('send_start_service_to_client',data);
  });
  socket.on('send_start_route_from_the_driver',function(data){
    io.to(data.room).emit('send_start_route_to_client',data);
  });
  socket.on('send_end_route_from_the_driver',function(data){
    io.to(data.room).emit('send_end_route_to_client',data);
  });
  socket.on('send_real_time_location_from_driver',function(data){
    console.log('sended real time data')
    io.to(data.room).emit('send_real_time_location_to_client',data);
  });
  socket.on('cancel_trip',function(data) {
    console.log('trip canceld');
    io.to(data.room).emit('emit_cancel_trip',data)
  });
});

http.listen(3000, function(){}); // Http Listen