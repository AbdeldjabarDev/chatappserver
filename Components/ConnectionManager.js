
const { toBigIntBE, toBigIntLE, toBufferLE, toBufferBE } =require("bigint-buffer");
const engine = require("engine.io");
const CryptoJS = require('crypto-js');
const { enc } = require("crypto-js");
const MessagingManager = require("./MessagingManager");
const AccountManager =  require("./AccountManager");
const io = engine.listen(7000, {
    cors: "*",
  });
  const errors = {
    CHAT_APP_OK:0,
    EMAIL_USED :5,
    INTERNAL_ERROR:10,
    INCORRECT_PASSWORD:2,
    INVALID_EMAIL:3,
    INVALID_CODE:4,
    NO_ACCOUNT:6
  }
  class Message {
    id;
    authKey;
    senderId;
    receiverId;
    timestamp;
    type;
    payload;
    length;
    constructor() {}
  }
let globalA = BigInt(Math.ceil(Math.random()*1e4));
const ivs = [
    '101112131415161718191a1b1c1d1e1f',
    'ab11121ed415161718191afb1c1d1e1f',
    '10ee121314ef16aa181cca1b1c1d1e1f',
    '10ef12ca141516ff18191a1b1c1d1e1f',
    '1fa11213fe151617ee191a1b1c1d1e1f',
    '1bb11aa314ac51ef718191a1b1c1d1e1f',
    '1afe1b13141d1e1718d91aeb1cad1e1f',
    'af11cd13ea15161718ee1a1b1c1d1e1f',
  ]
  const MessageTypes = {
    Text: 0,
    Image: 1,
    Voice: 2,
    MessageDelievered: 3,
    MessageRead: 4,
    EncKeyRequest: 5,
    AuthKeyRequest: 6,
    EncKeyResponse: 7,
    AuthKeyResponse: 8,
  };

  const WAtoBuf = (words) =>
{

let helper = new Uint32Array(words);
return Buffer.from(helper.buffer);
}
const BuftoWA = (buf)=>
{

  let nbuf;
  if(buf.length % 16 == 0)
  nbuf =  buf;
  else
nbuf = Buffer.concat([buf,Buffer.from(new Uint8Array(16-buf.length%16).buffer)]);
console.log('nbuf length : '  + nbuf.length + 'ar correct length : ' + nbuf.length/4);
let ar = new Array(nbuf.length/4);
for(let i = 0;i<nbuf.length;i=i+4)
{
  let b = nbuf.slice(i,i+4);
  ar[i/4] = new Uint32Array(new Uint8Array(Buffer.from(b)).buffer)[0];
}
console.log('ar length : ' + ar.length);
return CryptoJS.lib.WordArray.create(ar);
}
const pow = (base, expo) => base ** expo;
let connectionManager;

class ConnectionManager {
    openSocketsMap;
    rsidMap;
    messagingManager;
    accountManager;
    authKeyIdMap;
    /*
      authKey
      {
          key : ArrayBuffer
          expires : number;
      }
      */
    sockIdauthKeyMap;
    sockIdDecKeyMap;
    constructor() {
      if (connectionManager) 
      return connectionManager;
      else {
        connectionManager = this;
        this.openSocketsMap = new Map();
        this.rsidMap = new Map();
        this.messagingManager = new MessagingManager();
        this.accountManager = new AccountManager();
        this.authKeyIdMap = new Map();
        this.sockIdDecKeyMap = new Map();
        this.sockIdauthKeyMap = new Map();
        
        io.on("connection", (socket) => {
         
          socket.on("message", data => {
            console.log('got message ')
            this.handleMessage(data, socket);
          });
          
          socket.on("disconnect", () => {
            //TODO:handle client disconnect
             console.log('client disconnected : id : ' + rsid.get(socket.id) + ' with socket id : ' + socket.id);
             this.authKeyIdMap.delete(this.rsidMap.get(socket.id));
             this.rsidMap.delete(socket.id);
             this.sockIdDecKeyMap.delete(socket.id);
             this.sockIdauthKeyMap.delete(socket.id);
             
          
          });
        });
        return connectionManager;
      }
    }
    encryptAndSendMessage(data,socket)
    {
    
      let l = data.length;
      let wa = BuftoWA(data);
     let encKey = this.sockIdDecKeyMap.get(socket.id);
      console.log('encrypting with key : ' + encKey + 'associated with socket ' + socket.id);

      let i = Math.floor(Math.random()*10%8) // choose a random iv from the list of ivs
      console.log('i : ' + i + 'l : ' + l)
    let key = CryptoJS.SHA256(encKey);
      let iv = CryptoJS.enc.Hex.parse(ivs[i]);
      let enc = CryptoJS.AES.encrypt(wa,key,{iv:iv});
      console.log('encrypted wa length : ' +  enc.ciphertext.words.length);
      let res = Buffer.concat([Buffer.from(new Uint16Array([i]).buffer),Buffer.from(new Uint16Array([l]).buffer),WAtoBuf(enc.ciphertext.words)]);
      socket.send(res);
    }
    decryptMessage(data,socket)
    {
      let decKey = this.sockIdDecKeyMap.get(socket.id);
      if(decKey == undefined )
      {
        console.log('enc key not found for : ' + socket.id);
        return this.destructureMessage(data);
      }
      else
      {
        console.log('found decKey : ' + decKey +  'and auth key' + this.sockIdauthKeyMap.get(socket.id) + 'for socket : ' + socket.id );
        let i = new Uint16Array(data.slice(0,2))[0];
        let rl = new Uint16Array(data.slice(2,4))[0];
        let wa = BuftoWA(data.slice(4));
        let cp = CryptoJS.lib.CipherParams.create({ciphertext:wa});
        let key = CryptoJS.SHA256(decKey);
        let iv = CryptoJS.enc.Hex.parse(ivs[i]);
        let dec = CryptoJS.AES.decrypt(cp,key,{iv:iv}); 
        console.log( 'dec length  : ' + dec.words.length + ' sigBytes : ' + dec.sigBytes);
        let buf = WAtoBuf(dec.words);
        console.log('datalength ' + buf.length);
        return this.destructureMessage(buf);
      }
    }
    getSocketById(id) {}
    removeSocketById(id) {}
    destructureMessage(data) {
      let helper = Buffer.from(data);
      console.log("data : " + data + "with length  : " + helper.byteLength);
      let msgObj = new Message(); // |     Header      |      payload      |
      //  --------60 Bytes- -- 0 - 65535 Bytes--
      try {
        let id = helper.slice(0,4); // 4 Bytes for id 
   
        let auth = helper.slice(4,36); // 32 Bytes for authKey 
        
        let sender = helper.slice(36, 68); // 32 Bytes for sender id 

  
        let receiver = helper.slice(68, 100); // 32 Bytes for receiver
    
        let timeStamp = helper.slice(100, 108); // 8 bytes for timestamp
     
      
        
        let type = data[108]; // 1 Byte for type
      
        
        let payloadLength = new Uint16Array(helper.slice(109,111))[0]; // 2 Bytes for payload length
        let reserved = helper.slice(111, 112); // 1 Byte reserved
        let payload = helper.slice(112,112+payloadLength); // payload of 0-65535 bytes length
        console.log("got payload length " + payloadLength + " real length : " + payload.length);
        msgObj.authKey = auth;
        msgObj.id = id;
        msgObj.receiverId = receiver;
        msgObj.senderId = sender;
        msgObj.timestamp = timeStamp;
        msgObj.type = type;
        msgObj.payload = payload;
      } catch (e) {
        console.log(e);
        throw e;
      }
      return msgObj;
    }
    structureMessage(msgObj) {
  
      console.log('sm : id ' + msgObj.id);
      console.log('sm : authkey : ' + msgObj.authKey.toString('hex'));
      console.log('sm : senderid : ' + msgObj.senderId.toString('hex'));
      console.log('sm : receiverid : ' + msgObj.receiverId.toString('hex'));
      console.log('sm : payload' + msgObj.payload.toString('hex'));
      let res,dataBuf;
      switch(msgObj.type)
      {
          case MessageTypes.Text:        
               dataBuf = Buffer.concat([           
                  new Uint8Array(new Uint32Array(msgObj.id).buffer),
                  new Uint8Array(msgObj.authKey),
                  new Uint8Array(msgObj.senderId),
                  new Uint8Array(msgObj.receiverId),
                 msgObj.timestamp,
                  new Uint8Array([msgObj.type]),
                  new Uint8Array(new Uint16Array([msgObj.length]).buffer),
                  new Uint8Array(1),
                  new Uint8Array(msgObj.payload)
                ]);
                console.log('structure message : buf length ' + dataBuf.length);
                res = dataBuf;

              break;
         
      }
    return res;

    }
    getDecKey(sockId) {
      return;
    }
    async handleMessage(data, socket) {
        let msg = this.decryptMessage(data,socket);
        if(this.sockIdDecKeyMap.get(socket.id) == undefined)
        {
          if (msg.type != MessageTypes.EncKeyRequest) {
            console.log("msgtype : " + msg.type + "enckeyreq  : " + MessageTypes.EncKeyRequest)
            socket.send("Shoud be enc key request");
            socket.disconnect(true);  
          }
        }
        if (!this.checkSenderId(msg.senderId)) {
          socket.send("Invalid sender id");
          socket.disconnect(true);
          return;
        }
        this.handleHandshake(msg,socket)
        switch (msg.type) {
          //TODO : parse payload depeneding on type
          case MessageTypes.Text:
          case MessageTypes.Image:
          case MessageTypes.Voice:
          case MessageTypes.MessageDelievered:
          case MessageTypes.MessageRead:
          
            console.log('message received with type : ' + msg.type);
            this.rsidMap.forEach((v,k)=>
            {
                console.log('found connected client id : ' + k + 'with socket id : ' + v.id);
            })
            if (await this.accountManager.checkAuthKey(msg.authKey)) 
            { // check if auth key valid for particular sender id
              let s = this.rsidMap.get(msg.receiverId.toString('hex'));
              if (s != undefined) {
                console.log('receiver is connected')
                let resMsg = new Message();
                resMsg.id = new Uint32Array([msg.id])[0] + 1;
                resMsg.authKey = Buffer.from(this.sockIdauthKeyMap.get(s.id),'hex');              // set id
                resMsg.senderId = msg.senderId;
                resMsg.receiverId = msg.receiverId;
                resMsg.timestamp = msg.timestamp;
                resMsg.type = msg.type;
                resMsg.length = msg.length;
                resMsg.payload = msg.payload;
                
                let msg_buf = this.structureMessage(resMsg);
                //TODO: send message to connected client
                this.encryptAndSendMessage(msg_buf,s);
                console.log('message sent to client : ' + resMsg.receiverId.toString('hex') + ' with socket id ' + s.id);

              } else {
                console.log('receiver not connected')
                // this.messagingManager.insertPendingMessage(msg);
              }
            } else {
              socket.send("Invalid auth key!");
              socket.disconnect(true);
            }
            break;
        }
        return;
      }
      isClientConnected(id)
      {
        if(this.rsidMap.get(id))
        return true;
        else
        return false;
      }
      checkSenderId(senderId)
      {
        //TODO : check sender Id
        return true;
      }
      handleHandshake(msg, socket) {
        let msgRef = msg;
        switch (msg.type) {
          case MessageTypes.EncKeyRequest:
         
            console.log("EncKeyRequest received");
            let msgRes = new Message();
            let g = 3n;
            let p = 5210644015679228794060694325390955853335898483908056458352183851018372555735221n;
            // or p = 6864797660130609714981900799081393217269435300143305409394463459185543183397656052122559640661454554977296311391480858037121987999716643812574028291115057151n;
            let a = globalA;
            let res = pow(g, a) % p;
            msgRes.authKey = new Uint32Array(8);
            msgRes.type = MessageTypes.EncKeyResponse;
            // msgRes.receiverId = msgObj.senderId;
            msgRes.receiverId =new Uint8Array(8);
            msgRes.id = new Uint32Array([0]);
            msgRes.timestamp = toBufferBE(BigInt(new Date().getTime()),8); // number of seconds since epoch
            msgRes.payload = toBufferBE(res,128);
            // TODO : test msgToBuffer()
            let b = Buffer.concat(
              [
              new Uint8Array(msgRes.id.buffer),
              new Uint8Array(msgRes.authKey.buffer),
              new Uint8Array(8),
              new Uint8Array(msgRes.receiverId.buffer),
              msgRes.timestamp,
              new Uint8Array([MessageTypes.EncKeyResponse]),
              new Uint8Array(new Uint16Array([msgRes.payload.buffer.length]).buffer),
              new Uint8Array(1),
              toBufferBE(res,128)
              ]
            );
            socket.send(b);
            // add EncryptionKey to sockIdDekKeyMap 
            // console.log('res server : ' + res);
            // console.log('res : ' + toBigIntBE(msgRef.payload));
            this.sockIdDecKeyMap.set(socket.id, (pow(toBigIntBE(msgRef.payload),a)%p).toString(16));
            console.log('add key to : ' + socket.id);
            console.log('got key : ' + (pow(toBigIntBE(msgRef.payload),a)%p).toString(16) + 'total data sent length : ' + b.byteLength);
            break;
          case MessageTypes.AuthKeyRequest:
            this.rsidMap.set(msgRef.senderId.toString('hex'),socket);
            console.log('associated : ' + msgRef.senderId + ' with ' + 'socket id ' + socket.id); 
            console.log('Authkey request received');
            let authKey = new Uint32Array(CryptoJS.SHA256(msgRef.senderId).words); // to be determined and generated after validating the senderid
            console.log('auth key byte length : ' + authKey.byteLength);
            // console.log('recid : ' + msgRef.receiverId.toString('hex') + ' senderid : ' + msgRef.senderId.toString('hex') + ' timestamp : ' + msgRef.timestamp.toString('hex'));
            let bb = Buffer.concat(
              [
              new Uint8Array(new Uint32Array([1]).buffer),
              new Uint8Array(32),
              new Uint8Array(32),
              // new Uint8Array(this.rsidMap.get(socket.id)),
              new Uint8Array(32),
              // new Uint8Array([MessageTypes.AuthKeyResponse]),
              new Uint8Array(new Uint32Array([new Date().getTime()]).buffer),
              new Uint8Array([MessageTypes.AuthKeyResponse]),
              new Uint8Array(new Uint16Array([32]).buffer),
              new Uint8Array(1),
              new Uint8Array(authKey.buffer)
            ]
            );
            console.log(Buffer.from(new Uint16Array([32]).buffer).toString('hex'))
            console.log('bb : ' + bb.toString('hex'));
            this.encryptAndSendMessage(bb,socket);
            console.log('auth key : ' + Buffer.from(authKey.buffer).toString('hex'));
            // socket.send(result);
            this.authKeyIdMap.set(msgRef.senderId.toString('hex'), Buffer.from(authKey.buffer).toString('hex'));
            this.sockIdauthKeyMap.set(socket.id,Buffer.from(authKey.buffer).toString('hex'));
            break;
        }
      }
    

}

module.exports =  ConnectionManager;    