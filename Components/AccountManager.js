const { default: mongoose } = require("mongoose");
const CryptoJS = require('crypto-js');
const { ObjectId } = require("mongodb");
let accountManager;
const errors = {
    CHAT_APP_OK:0,
    EMAIL_USED :5,
    INTERNAL_ERROR:10,
    INCORRECT_PASSWORD:2,
    INVALID_EMAIL:3,
    INVALID_CODE:4,
    NO_ACCOUNT:6
  }
class AccountManager {
    AccountModel;
    TokenModel;
    connectedClients;
    constructor() {
      if (accountManager) return accountManager;
      else {
        accountManager = this;
        let accountConnection = mongoose.createConnection(process.env.DB_URL_CHAT + '/accounts'+ process.env.ACCESS_PARAMS)
        let accountSchema = mongoose.Schema({ 
          email:String,
          acc_id:String,
          photo_url:String,
          user_name:String,
          phone_number:String,
          password:String,
          })
          let tokenConnection = mongoose.createConnection(process.env.DB_URL_CHAT + '/tokens' + process.env.ACCESS_PARAMS);
          let tokenSchema = mongoose.Schema({
            target:String,
            token:String,
            acc_id:String,

          })
          this.AccountModel =  accountConnection.model('accounts',accountSchema);
        
          this.TokenModel = tokenConnection.model('tokens',tokenSchema);
          this.connectedClients = [];
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
        return accountManager;
      }
    }
   async addAccount(email,password,profile_photo,un) {
      let vacc = await this.AccountModel.findOne({email:email});
      
      if(vacc != undefined)
      {
        console.log('email already used' + vacc);
        return {error:errors.EMAIL_USED}
      }
      let acc = new this.AccountModel({
        email:email,
        acc_id:CryptoJS.SHA256(email+un).toString(),
        photo_url:profile_photo,
        user_name:un,
        password:password,
      });
      try
      {
        await acc.save();
        return {error:errors.CHAT_APP_OK}
      }
      catch(e)
      {
        console.log(e);
      return {error:errors.INTERNAL_ERROR}
      }
    }
  async checkAuthKey()
  {
    return true;
  }
  async checkAccount(email,password) {
     let acc = await this.AccountModel.findOne({email:email});
     if(acc == undefined)
     {
      return {error:errors.NO_ACCOUNT}
     }
     if(CryptoJS.SHA256(acc.password).toString()!=password)
     {
      return{error:errors.INCORRECT_PASSWORD};
     }
     else
     {
        let ptoken = await this.TokenModel.findOne({target:email});
        console.log('ptoken : ' + ptoken)
        if(!ptoken)
        {
            let token = CryptoJS.SHA256(email+password+(Math.ceil(Math.random()*1e12))).toString();
            let tokenObj = new this.TokenModel({target:email,token:token,acc_id:acc.acc_id});
            console.log('sent token : ' + token + 'account id : ' + acc.acc_id);
            this.connectedClients.push(acc.id)
            try
            {
              await tokenObj.save();
              let pt = await this.TokenModel.findOne({target:email}); 
              console.log('generated new token : ' + pt.token + ' for  : ' + pt.target);
              return {error:errors.CHAT_APP_OK,token:token,id:pt.acc_id}
            }
           catch(e)
           {
            console.log('CheckAccount : ' + e.toString());
            return {error:errors.INTERNAL_ERROR};
           }
        }
        else
        {
            console.log('token already exists : ' + ptoken.token + ' email : ' + ptoken.target);
            return {error:errors.CHAT_APP_OK,token:ptoken.token,id:ptoken.acc_id};
        }
     
     }
    }
    async deleteAccount(id) 
    {
        let res = await this.AccountModel.deleteOne({_id:new ObjectId(id)});
        return {error:errors.CHAT_APP_OK};
    }
    async getAllAccounts()
    {
        console.log('all accounts request received')
        let accs = await this.AccountModel.find({});
        return accs;
    }
    async deleteTokens()
    {
        await this.TokenModel.deleteMany({});
        return {error:errors.CHAT_APP_OK}
    }
   
  }
  module.exports = AccountManager;