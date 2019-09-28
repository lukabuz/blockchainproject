//defining the function to create hashes of strings. used for password storage
String.prototype.hashCode = function() {
  var hash = 0,
    i,
    chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

//The wallet class. Main object that stores the private/public keys and wallet methods.
class Wallet {
  // construct the wallet object. if there is one in storage load it, if not then bring up wallet creation prompt
  constructor() {
    var privateKey = this.getPrivateKey();
    if (privateKey) {
      //private key was found, there is already a wallet initialized
      var password = "";
      var decryptedPrivateKey = false;
      password = this.getPassword(false);
      decryptedPrivateKey = this.decryptPrivateKey(privateKey, password);
      while (!decryptedPrivateKey) {
        password = this.getPassword(true);
        decryptedPrivateKey = this.decryptPrivateKey(privateKey, password);
      }
      this.wallet = new SimpleWallet(decryptedPrivateKey);
      console.log(this.wallet.mnemonic);
      return true;
    } else {
      //there is no private key initialized
      var password = this.setPassword(); //create and set password
      //generate private key and save it
      var privateKey = this.generatePrivateKey();
      this.savePrivateKey(this.encryptPrivateKey(privateKey, password));
      this.wallet = new SimpleWallet(privateKey);
      return true;
    }
  }
  //get password for existing wallet
  getPassword(wrongPassword) {
    var prompt = wrongPassword ? "Wrong Password! " : "";
    var password = window.prompt(
      prompt + "Please enter the password for your wallet"
    );
    if (password == null || password == "") {
      return this.getPassword();
    }
    this.password = password;
    return this.password;
  }
  //set password for a new wallet
  setPassword(password) {
    var password = window.prompt("Please enter a password for your new wallet");
    if (password == null || password == "") {
      return this.setPassword();
    }
    this.password = password;
    localStorage.setItem("password", password.hashCode());
    return password;
  }
  //decrypt a private key with a password
  decryptPrivateKey(key, password) {
    if (password.hashCode() == localStorage.getItem("password")) {
      return CryptoJS.AES.decrypt(key, password).toString(CryptoJS.enc.Utf8);
    }
    return false;
  }
  //encrypt a private key with a password
  encryptPrivateKey(key, password) {
    return CryptoJS.AES.encrypt(key, password);
  }
  //save the private key to localStorage
  savePrivateKey(key) {
    localStorage.setItem("encryptedPrivateKey", key);
  }
  //get the private key from localstorage
  getPrivateKey() {
    if (localStorage) {
      //check if localstorage is enabled. for environments like webView this is needed
      var privateKey = localStorage.getItem("encryptedPrivateKey");
      return privateKey ? privateKey : false;
    } else {
      throw new Error(
        "Please use a browser that allows the use of localstorage"
      );
    }
  }
  //generate a random private key for wallet
  generatePrivateKey() {
    return faker.random.words(12);
  }
}

// localStorage.clear();
var coinwallet = new Wallet();
