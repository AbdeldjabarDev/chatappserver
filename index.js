const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const { checkPrimeSync } = require("crypto");
const { SourceMap } = require("module");
const http = require("http");
const server = http.createServer(app);
const ConnectionManager = require("./Components/ConnectionManager");
const AccountManager =  require("./Components/AccountManager");
// import { ConnectionManager } from "./Components/ConnectionManager";
// import { AccountManager } from "./Components/AccountManager";
const errors = {
  CHAT_APP_OK:0,
  EMAIL_USED :5,
  INTERNAL_ERROR:10,
  INCORRECT_PASSWORD:2,
  INVALID_EMAIL:3,
  INVALID_CODE:4,
  NO_ACCOUNT:6
}
const equals = (arr1, arr2) => {
  if (arr1.length != arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] != arr2[i]) return false;
  }
  return true;
};





// const getBigPrime = ()=>
// {
//     let candidate = 2;
//     while(!checkPrimeSync(candidate))
//     {
//         // easy to break ? yeah i know
//         candidate = BigInt().from(Number.MAX_SAFE_INTEGER - Math.ceil(Math.random()* (1e25)));
//     }
//     return candidate;

// }

function msgToBuffer(msg) {
  Object.entries(msg).forEach((v) => {
    if (!isAnyArrayBuffer(v)) throw "Not an Array buffer" + v;
  });
  if (isAnyArrayBuffer())
    return Buffer.concat(
      msg.id.buffer,
      msg.authKey.buffer,
      new Uint8Array(8).buffer,
      msg.recieverId.buffer,
      msg.timestamp.buffer,
      msg.payload.buffer
    );
}
class Message {
  id;
  authKey;
  senderId;
  recieverId;
  timestamp;
  type;
  payload;

  constructor() {}
}
class Account {
  email;
  id;
  photo_url;
  user_name;
  phone_number;
  address;
}
let messagingManager;

let accountManager;
let connectionManager;
// io.on('connection',socket =>
// {
// socket.send('Hello,From server');
// socket.on('disconnect',()=>{

// })
// })
app.use(bodyParser.json({limit:'20mb'}));
app.use(bodyParser.urlencoded());
app.get("/", (req, res) => {
  // res.send('Hello,World');
});
// @Header('Allow','POST')
// @Header('Access-Control-Allow-Origin','https://topshop-five.vercel.app')
// @Header('Access-Control-Allow-Headers','content-type,access-control-allow-origin')
// @Options('/reset')
// @Header('Allow','POST')
// @Header('Access-Control-Allow-Origin','https://topshop-five.vercel.app')
// @Header('Access-Control-Allow-Headers','content-type,access-control-allow-origin')
accountManager = new AccountManager();
// connectionManager = new ConnectionManager();
// messagingManager = new MessagingManager();
app.post("/login",async (req, res) => {
  // return id and authkey
  console.log('login request received');
  res.setHeader('Allow','POST');
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','content-type,access-control-allow-origin');
  let email = req.body.email;
  let pass = req.body.password_hash;
  let t = await accountManager.checkAccount(email,pass);
  res.send(t);
});
app.get('/all',async(req,res)=>
{
  let result =await accountManager.getAllAccounts();
  res.send(result);
})
app.get('/delete/:id',async(req,res)=>
{
  console.log('delete account request received with id : ' + req.params.id);
  let t = await accountManager.deleteAccount(req.params.id)
  res.send(t);
})

app.post("/signup",async(req, res) => {
  res.setHeader('Allow','POST');
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','content-type,access-control-allow-origin')
  // TODO : add to database and generate auth key for this client
  console.log('signup request received' + req.body.email + ' : ' + req.body.password);
  let email = req.body.email;
  let password = req.body.password;
  let pf = req.body.profile_photo;
  let user_name = req.body.user_name;
  let result = await accountManager.addAccount(email,password,pf,user_name);
  res.send(result);
  console.log('signup request handled');

});
app.get('/images/:id',(req,res)=>
{
  let id = req.params.id;
  let t = req.get('Authorization');
  if(t == undefined)
  {
    res.status(401);
    res.send();
  }
  if(accountManager.checkToken(t))
  {
    let image = accountManager.getImage(id);
    res.send(image);
  }
  else
  {
    res.status(401);
    res.send();
  }
})
app.get("/chat",async (req, res) => {
  //TODO : for now the tokens are the virtual ids later it will be changed
  // TODO: return all clients and their state (connected or disconnected)
  res.setHeader('Allow','GET');
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','content-type,access-control-allow-origin,authorization')
  let t = req.get('Authorization').split(' ')[1];
  console.log('chat request received with token ' + t);
  let result = [];
  let agent = await accountManager.TokenModel.find({token:t});
  let accs =await accountManager.AccountModel.find({});
  for(let i = 0;i<accs.length;i++)
  {
   if(agent.target != accs[i].email)
   result.push({user_name:accs[i].user_name,id:accs[i].acc_id,photo:accs[i].photo_url});
  }
  res.send(result);

});
app.get('/clear-tokens',async(req,res)=>
{
  console.log('clear tokens request received');
 let result = await accountManager.TokenModel.deleteMany({});
 res.send({error:0});
})
app.options('/chat',(req,res)=>
{
  res.setHeader('Allow','GET');
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','content-type,access-control-allow-origin,authorization')
  res.send(); 
})
app.options('/login',(req,res)=>
{
    res.setHeader('Allow','POST');
    res.setHeader('Access-Control-Allow-Origin','*')
    res.setHeader('Access-Control-Allow-Headers','content-type,access-control-allow-origin')
    res.send();
})
app.options('/signup',(req,res)=>
{
 
  res.setHeader('Allow','POST');
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','content-type,access-control-allow-origin')
  res.send()
});
app.get('/logout',(req,res)=>
{
  console.log('logout request received');
})
app.options('/logout',(req,res)=>
{
  res.setHeader('Allow','POST');
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Headers','content-type,access-control-allow-origin')
  res.send()
})
app.get('/delete-tokens',async(req,res)=>
{
  let r = await accountManager.deleteTokens();
  res.send(r);
})

app.options('/chats',(req,res)=>
{
res.setHeader('Allow','*');
res.setHeader('Allow-Cross-Origin','*');
res.send(JSON.stringify({dummy:''}))
})

connectionManager = new ConnectionManager();
server.listen(8080, () => {
  console.log("app listenening on port 8080");
});
