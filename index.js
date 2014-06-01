var dns = require('native-dns'),
    redis = require('redis-url'),
    _ = require('underscore');

if (process.env.AIRBRAKE_API_KEY) {
  var airbrake = require('airbrake').createClient(process.env.AIRBRAKE_API_KEY);

  airbrake.handleExceptions();
}

var server = dns.createServer();
var redisClient = redis.connect(process.env.REDIS_URL || 'redis://localhost:6379');

function recurse(question, response) {
  var proxyRequest = dns.Request({
    question: question,
    server: { address: '8.8.8.8', port: 53, type: 'udp' },
    timeout: 1000
  });

  proxyRequest.on('message', function(error, answer) {
    if (error) {
      response.send();
    } else {
      response.answer = _.map(answer.answer, function(answerElement) {
        if (answerElement.data instanceof Array) {
          answerElement.data = answerElement.data[0];
        }

        return answerElement;
      });

      response.additional = answer.additional;
      response.authority = answer.authority;

      response.send();
    }
  });

  proxyRequest.on('timeout', function() {
    response.send();
  });

  proxyRequest.send();
};

server.on('request', function(request, response) {
  var question = dns.Question(request.question[0]);

  /* Set recursion as available according to client request */
  response.header.ra = request.header.rd;

  if (question.type === 1) {
    redisClient.get(question.name, function(error, reply) {
      if (error || reply == null) {
        recurse(question, response);
      } else {
        response.answer.push(dns.A({
          name: question.name,
          address: reply,
          ttl: 600
        }));

        response.send();
      }
    });
  } else {
    recurse(question, response);
  }
});

server.serve(process.env.PORT || 53);
