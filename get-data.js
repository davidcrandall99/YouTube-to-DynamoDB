const YouTube = require('simple-youtube-api');
const EventEmitter = require('events');
const event = new EventEmitter;
const youtube = new YouTube(site.env.API_KEY);
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

module.exports.data = (e, context, callback) => {
    let channelID = site.env.CHANNEL_ID;

    event.on("complete", (data) => {
        
        for(i in data) {            
            var params = {
                Item: data[i], 
                ReturnConsumedCapacity: "TOTAL", 
                TableName: site.env.DYNAMODB_TABLE
               };
            
            dynamodb.putItem(params, (err, data) => {
                if(err) {
                    callback(err)
                } else {
                    var response = {
                        "statusCode": 200,
                        "body": JSON.stringify(data),
                        "isBase64Encoded": false
                    };
            
                    callback(null, response)
                }
            });
        }

        
        event.removeAllListeners();
        
    });

    //put the videos into an array and emit it.
    event.on("videos found", (videos) => {
        let count = videos.length;
        let data = []
        //BEGIN FOR LOOP
        videos.forEach(result => {

            let videoID = result.id; //console.log(`videoID: ${videoID}`);
            let title = result.title; //console.log(`title: ${title}`);
            let type = result.type; //console.log(`type: ${type}`);

            //console.log(result);
            youtube.getVideoByID(videoID).then(info => {

                let uri = info.title.replace(/\W+/g, '-').replace(/\-$/, '').toLowerCase();
                data.push({
                    "title": { S: info.title },
                    "description": { S: info.description },
                    "videoUrl": { S: info.url},
                    "id": { S : info.id },
                    "uri":{S: uri},
                    "uploaded" :  {S: JSON.stringify(info.publishedAt)},
                    "duration" : {S: `"hours": ${info.duration.hours}, "minutes": ${info.duration.minutes}, "seconds": ${info.duration.seconds}`},
                    "thumbnails" : {S: JSON.stringify(info.thumbnails)},
                    //"tags" : {SS: JSON.parse(JSON.stringify(info.raw.snippet.tags))}
                });
                if (data.length === count) {
                    event.emit("complete", data);
                }
            }).catch(console.log);


        });// END FOR LOOP


    });

    //search for videos by channel
    youtube.search('', 100, { 'channelId': channelID, 'order': 'date' })
        .then(results => {

            for (result in results) {
                if (results[result].type !== "video") {
                    results.pop(result);
                }
            }
            event.emit("videos found", results);
        }).catch(console.log);
}