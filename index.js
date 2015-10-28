var request = require('request')
  , cheerio = require('cheerio')
  , restify = require('restify')
  , moment = require('moment')
  , querystring = require('querystring')
  , _ = require('lodash');

var SLACK_INCOMING_URL='https://hooks.slack.com/services/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';
var server = restify.createServer({
    name: 'myapp',
    version: '1.0.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/', function(req, res, next) {
    var callback = function(err, data) {
        res.send(data);
        res.end();
    };
    getSchedule(callback);
});

server.post('/', function (req, res, next) {
    var body = querystring.parse(req.body);
    var dayIndex;

    if (body.text === "" || !body.text){
        dayIndex = moment().day();
    } else {
        dayIndex = moment().day(body.text).day();
    }

    if(body.text !== "" && !moment(body.text,'dddd', true).isValid()){
        req.slackresponse = constructSlackResponse("Really!?", '#test')
        return next();
    }  
    
    if (dayIndex === 0 || dayIndex == 6){
        req.slackresponse = constructSlackResponse("Go Home! It's the weekend!", '#test')
        return next();
    }
    dayIndex--;

    getSchedule(function(err, response){
        var text = constructMessage(response[dayIndex]);
        var resp = constructSlackResponse(text, "#test");
        req.slackresponse = resp;      
        return next();  
    });
}, function(req,res,next){

    request.post({
        url:SLACK_INCOMING_URL, body:JSON.stringify(req.slackresponse)
    }, function(err,httpResponse,body){
        res.end();
        return next();
    });
});

var getSchedule = function getSchedule(callback){
    var url = 'http://shippingandreceiving.nyc/';

    request(url, function(err, resp, body){
        var $ = cheerio.load(body);
        var schedule = $('#pg-4-1'); 
        var children = schedule.children().children();
        var finalSchedule = [];
        
        for (var y = 0; y < 5; y++) {
            day = $(children[y]).find('p').children('a');
            var options = [];          
            for (var i = 0; i < day.length; i++) {
                options.push({
                    name: $(day[i]).text(),
                    link:$(day[i]).attr('href')
                });
            }
            finalSchedule.push(options);
        }
        return callback(null, finalSchedule);
    });
};

var constructMessage = function constructMessage(response){
    var text = "Your options for today are:\n";
    _.forEach(response, function(m){
        text += '\t' + m.name + " (<" + m.link + ">)\n";
    });
    return text;
};

var constructSlackResponse = function constructSlackResponse(text, channel){
    var resp = {
        "channel": channel, 
        "username": "Shipping and Receiving", 
        "text": text,
        "icon_emoji": ":truck:"
    };
    return resp;
};

server.listen(8080, function () {
    console.log('%s listening at %s', server.name, server.url);
});
