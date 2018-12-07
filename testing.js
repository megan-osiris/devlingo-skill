const AWS = require('aws-sdk');
AWS.config.loadFromPath("../config.json");
var ddb = new AWS.DynamoDB.DocumentClient();
var params = {
   "ConsistentRead": true,
   "Key": { 
      "User": "amzn1.ask.account.AFDHS6KPNWKQLDI4QIGWMW4XPZHVYSFQU3UNA3LTDZFR5W2XCMAMMK3AMVTK2YTXZ7INVI7TYCBWOIMYLYKRSJFG5IRX4QZUI7SKS3553K2S2XJO23LWEV3JNMU4LFSOPKBYT3FMAJBA4AGV4HA4OCTCQ66DVIRHG2TMZ4QGUJKLRZBTIATSLHWFHQTO55FSFCUMQYTYJS2NOCQ"
   },
   "ReturnConsumedCapacity": "NONE",
   "TableName": "UserWords"
};
ddb.get(params).promise().then(data =>{
  console.log("the data: "+JSON.stringify(data));
  var params = {
    TableName: 'UserWords',
    Item: {
      'User' : "test",
      'Words' : "x",
    }
  };
  ddb.put(params).promise().then(data =>{
    console.log("the put data: " + JSON.stringify(data));
  }).catch(err=>{
    console.log("a put error"+err);
  });
}).catch(err =>{
  console.log("an error: "+err);
});
// ddb.getItem(params, function(err, data) {
//   if (err) {
//     console.log("Error", err);
//   } else {
//     console.log("Success", data);
//     console.log(data.Item.Words.S);
//   }
// });