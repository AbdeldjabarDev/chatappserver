let messagingManager;
const errors = {
    CHAT_APP_OK:0,
    EMAIL_USED :5,
    INTERNAL_ERROR:10,
    INCORRECT_PASSWORD:2,
    INVALID_EMAIL:3,
    INVALID_CODE:4,
    NO_ACCOUNT:6
  }
const mongoClient = require("mongodb").MongoClient;
class MessagingManager {
    db;
    constructor() {
      if (messagingManager) return messagingManager;
      else {
        messagingManager = this;
        mongoClient.connect("mongodb://localhost:27017/messagesdb").then((con) => {
          messagingManager.db = con.db();
  
          // con.db().createCollection('messages',{strict:true}).
          // then((collection)=>
          // {
          // this.col = collection;
          // return this.messaingManager;
          // }).
          // catch((e)=>{
          //   // already exists
          //   return this.messaingManager;
          // })
        });
      }
    }
    async insertPendingMessage(id, msgObj) {
      //TODO : check if receiver id is valid through account manager
      try {
        let res = await messagingManager.db
          .collection(id + "_pending")
          .insertOne(...msgObj);
        return { result: res, error: 0 };
      } catch (error) {
        return { result: null, error: error.message };
      }
    }
    async getPendingMessages(id) {
      try {
        let res = await messagingManager.db
          .collection(id + "_pending")
          .find({});
        return { result: res, error: 0 };
      } catch (error) {
        return { result: null, error: error.message };
      }
    }
    async getMessages(id, timestamp, howMuch) {
      try {
        let res = await messagingManager.db
          .collection(id)
          .find({})
          .addQueryModifier("$less", timestamp)
          .limit(howMuch);
        return { result: res, error: 0 };
      } catch (error) {
        return { result: null, error: error.message };
      }
    }
    async storeMessage(msgObj) {
      let sender = msgObj.senderId;
      let receiver = msgObj.receiverId;
      try {
        let res = await messagingManager.db
          .collection(sender.toString('hex'))
          .insertOne(msgObj);
        let res2 = await messagingManager.db
          .collection(receiver.toString('hex'))
          .insertOne(msgObj);
      } catch (e) {}
    }
    contructMessage(sender, receiver, type, timestamp, payload) {
      let payloadEncoded;
      switch (type) {
        case MessageTypes.Text:
          payloadEncoded = payload.toString("utf-8");
          break;
        case 1:
          break;
        case 2:
          break;
      }
      let buf = Buffer.from([sender, receiver, type, timestamp.getSeconds()]);
      let res = Buffer.concat([buf, Buffer.from(payloadEncoded)]);
      return res;
    }
  }
  module.exports = MessagingManager ;