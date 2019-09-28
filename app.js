// API key for newsapi.org
const newsApiKey = "e8701977d65f4fab955bf62044389166";
const newsApiUrl = "https://newsapi.org/v2/everything";

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
      //authentication
      var password = "";
      var decryptedPrivateKey = false;
      password = this.getPassword(false);
      decryptedPrivateKey = this.decryptPrivateKey(privateKey, password);
      while (!decryptedPrivateKey) {
        //repeat password prompt until the right password is given
        password = this.getPassword(true);
        decryptedPrivateKey = this.decryptPrivateKey(privateKey, password);
      }
      this.wallet = new SimpleWallet(decryptedPrivateKey); //create the simplewallet object from the decrypted private key
      return true;
    } else {
      //there is no private key initialized
      var password = this.setPassword(); //create and set password
      //generate private key and save it
      var privateKey = this.generatePrivateKey();
      this.savePrivateKey(this.encryptPrivateKey(privateKey, password));
      this.wallet = new SimpleWallet(privateKey);
      alert("Please save your private key in a safe place: " + privateKey);
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
  // get balance of wallet
  getBalance() {
    return this.wallet.getBalance();
  }
  // get address of wallet
  getAddress() {
    return this.wallet.legacyAddress;
  }
  //send bitcoin to address
  async sendBitcoin(address, amount) {
    try {
      const tx = await this.wallet.send([
        {
          address: "bitcoin:" + address,
          amountSat: amount / 0.00000001
        }
      ]);
      return true;
    } catch (e) {
      console.log(e);
      if (e == "Error: Insufficient balance") {
        alert(
          "transaction failed due to insufficient balance, please try again"
        );
      } else {
        alert("transaction failed, please try again");
      }

      return false;
    }
  }
}

class Page {
  constructor(wallet, eventListeners) {
    this.wallet = wallet;
    for (var i = 0; i < eventListeners.length; i++) {
      this.initializeEventListener(
        eventListeners[i].elementId,
        eventListeners[i].event,
        eventListeners[i].functionToRun
      );
    }
    return;
  }
  initializeEventListener(elementId, event, functionToRun) {
    document
      .getElementById(elementId)
      .addEventListener(event, () => functionToRun(this.wallet));
  }
  async updateWalletInfo() {
    //update wallet balance
    var balance = await this.wallet.getBalance();
    var balanceTag = document.getElementById("balance");
    balanceTag.innerHTML =
      "<strong>Bitcoin Wallet: </strong><a href='https://www.blockchain.com/btc/address/" +
      this.wallet.getAddress() +
      "' style='color: hsl(217, 71%, 53%)'>" +
      this.wallet.getAddress() +
      "</a><br />Balance: " +
      balance +
      "BTC";
    //update QR code
    var qrCode = document.getElementById("qrCode");
    qrCode.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=" +
      this.wallet.getAddress();
    var addressField = document.getElementById("addressField");
    addressField.value = this.wallet.getAddress();
    return;
  }
  //get last 2 weeks news related to bitcoin
  async updateNews() {
    //fetch json
    const link =
      newsApiUrl +
      "?q=bitcoin&from=" +
      new Date(Date.now() - 12096e5).toISOString() +
      "&sortBy=publishedAt&apiKey=" +
      newsApiKey;
    let response = await fetch(link);
    var articles = await response.json();
    articles = articles.articles;

    //set up html and add it to DOM
    var newsContainer = document.getElementById("newsContainer");
    newsContainer.innerHTML = "<strong>News</strong><br />";
    for (var i = 0; i < articles.length; i++) {
      newsContainer.innerHTML += this.articleMaker(
        articles[i].title,
        articles[i].urlToImage,
        articles[i].author,
        articles[i].publishedAt,
        articles[i].description,
        articles[i].url
      );
      if (i == 4) {
        break;
      }
    }
  }
  //formats innerHTML for news articles
  articleMaker(title, imageLink, author, date, text, url) {
    return (
      '<div class="box"><article class="media"><div class="media-left"><a href="' +
      url +
      '"><figure class="image is-64x64"><img src="' +
      imageLink +
      '" alt="Image"/></figure></a></div><div class="media-content"><div class="content"><p><a href="' +
      url +
      '"><strong>' +
      title +
      "</strong></a> <small>" +
      author +
      "</small> <small>" +
      date +
      "</small><br />" +
      text +
      "</p></div></div></article></div>"
    );
  }
}

// localStorage.clear();
var coinwallet = new Wallet();
//event listeners must be defined here, they will be passed into the page object
// elementId: id of the element to listen to
// event: event to listen for
// functionToRun: function to run, the page object passes in the wallet object to this function
eventListeners = [
  //event listener for transaction sending handling
  {
    elementId: "transferButton",
    event: "click",
    functionToRun: async wallet => {
      const recipientAddress = document.getElementById("recipientAddress");
      const amountToSend = document.getElementById("amountToSend").value;
      if (isNaN(amountToSend)) {
        alert("Please enter a number in the amount to send field");
        return;
      }
      wallet.sendBitcoin(recipientAddress, amountToSend);
      return;
    }
  },
  //event listener for copying the address of the wallet
  {
    elementId: "copyAddressButton",
    event: "click",
    functionToRun: async wallet => {
      const addressField = document.getElementById("addressField");
      addressField.select();
      addressField.setSelectionRange(0, 99999);
      document.execCommand("copy");
    }
  }
];
var page = new Page(coinwallet, eventListeners);

page.updateWalletInfo();
page.updateNews();
