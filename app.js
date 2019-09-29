// API key for newsapi.org
const newsApiKey = "e8701977d65f4fab955bf62044389166";
const newsApiUrl = "https://newsapi.org/v2/everything";

//api for viewing transaction info
const transactionApiUrl = "https://bch-chain.api.btc.com/v3/tx";

//api for getting coin prices
const coinLayerApiKey = "d85c506d09c7ee25c0f5f0f2f21a03d4";
const coinLayerApiUrl =
  "http://api.coinlayer.com/api/live?symbols=BCH,ETH,BTC,LTC,XRP,XLM,XMR&access_key=" +
  coinLayerApiKey;

//api for getting coin symbol images
const symbolImageUrl = "https://s2.coinmarketcap.com/static/img/coins/64x64";
//object that stores corresponding ids to cryptos for the imaging api
const symbols = {
  BCH: 1831,
  ETH: 1027,
  BTC: 1,
  LTC: 2,
  XRP: 52,
  XLM: 512,
  XMR: 328
};

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
  constructor(notificationHandler) {
    this.notificationHandler = notificationHandler;
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
      this.notificationHandler.message(
        "Wallet created successfully. Please save your private key in a safe place: " +
          privateKey,
        "primary"
      );
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
        this.notificationHandler.message(
          "Transaction failed due to insufficient balance, please try again.",
          "danger"
        );
      } else {
        this.notificationHandler.message(
          "Transaction failed, please try again.",
          "danger"
        );
      }

      return false;
    }
  }
  //get the info of a wallet from simplewallet api
  async getWalletInfo() {
    return new Promise(async resolve => {
      const myWalletInfo = await this.wallet.getWalletInfo();
      resolve(myWalletInfo);
    });
  }
  //get a list of transactions(very slow). can interact with progressbar if needed
  async getTransactions(progressBar) {
    //get transaction list
    let wallet = await this.getWalletInfo();
    console.log(wallet.transactions);
    let transactions = [];
    if (progressBar) {
      progressBar.max = wallet.transactions.length;
      progressBar.value = 0;
    }
    //loop through list and get info about each transaction from api, very inefficient
    for (var i = 0; i < wallet.transactions.length; i++) {
      if (progressBar) {
        progressBar.value += 1;
      }
      console.log(i + "/" + wallet.transactions.length);
      let transactionInfo = await this.getTransactionInfo(
        wallet.transactions[i]
      );
      transactions.push(transactionInfo);
    }
    if (progressBar) {
      progressBar.remove();
    }
    return transactions;
  }
  //use the transaction api to get info about a transaction
  async getTransactionInfo(transactionId) {
    let link = transactionApiUrl + "/" + transactionId;
    let response = await fetch(link);
    let transactionInfo = await response.json();
    return transactionInfo;
  }
  //delete the wallet(delete encrypted private key and password hash from local storage)
  deleteWallet() {
    localStorage.clear();
    return;
  }
}

class Page {
  constructor(wallet, eventListeners, notificationHandler) {
    this.wallet = wallet;
    this.notificationHandler = notificationHandler;
    this.updateWalletInfo();
    this.updateNews();
    this.updateCoinPrices();
    for (var i = 0; i < eventListeners.length; i++) {
      this.initializeEventListener(
        eventListeners[i].elementId,
        eventListeners[i].event,
        eventListeners[i].functionToRun
      );
    }
    return;
  }
  //initialize event listeners. passes in wallet and notification handler objects
  initializeEventListener(elementId, event, functionToRun) {
    document
      .getElementById(elementId)
      .addEventListener(event, () =>
        functionToRun(this.wallet, this.notificationHandler)
      );
  }
  async updateWalletInfo() {
    //update wallet balance
    var balance = await this.wallet.getBalance();
    var balanceTag = document.getElementById("balance");
    balanceTag.innerHTML =
      "<strong>Bitcoin Cash Wallet: </strong><a href='https://www.blockchain.com/btc/address/" +
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
    console.log(articles);

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
    author = author ? author : "Anonymous";
    return (
      '<div class="box"><article class="media"><div class="media-left"><a href="' +
      url +
      '"><figure class="image is-64x64"><img src="' +
      imageLink +
      '" alt="No Image"/></figure></a></div><div class="media-content"><div class="content"><p><a href="' +
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
  //update the coin prices view
  async updateCoinPrices() {
    //get response from api
    let response = await fetch(coinLayerApiUrl);
    let prices = await response.json();
    prices = prices.rates;
    //add everything to container
    let priceContainer = document.getElementById("pricesContainer");
    const keys = Object.keys(prices);
    for (const key of keys) {
      priceContainer.innerHTML += this.priceViewMaker(
        symbols[key],
        prices[key],
        key
      );
    }
    console.log(prices);
  }
  //formats innerHTML for coin prices
  priceViewMaker(iconId, price, sign) {
    return (
      '<nav class="level"><div class="level-left"><div class="level-item"><figure class="image is-64x64"><img src="img/usd.png" alt="usd" /></figure></div><div class="level-item"><p class="subtitle is-5">1 USD</p></div></div><div class="level-left"><div class="level-item"><p class="subtitle is-5">=</p></div></div><div class="level-right"><div class="level-item"><figure class="image is-64x64"><img src="https://s2.coinmarketcap.com/static/img/coins/64x64/' +
      iconId +
      '.png"alt="Image"/></figure></div><div class="level-item"><p class="subtitle is-5">' +
      price +
      " " +
      sign +
      "</p></div></div></nav>"
    );
  }
}

class NotificationHandler {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    //initialize event listener for close buttons
  }
  showNotification(modal) {
    this.container.append(modal);
  }
  message(text, type) {
    var modal = document.createElement("div");
    modal.className = "notification is-" + type;
    var button = document.createElement("button");
    button.className = "delete";
    button.addEventListener("click", e => {
      e.currentTarget.parentNode.remove();
    });
    modal.append(button);
    modal.append(text);
    this.showNotification(modal);
  }
}

//event listeners must be defined here, they will be passed into the page object
// elementId: id of the element to listen to
// event: event to listen for
// functionToRun: function to run, the page object passes in the wallet object to this function
eventListeners = [
  //event listener for transaction sending handling
  {
    elementId: "transferButton",
    event: "click",
    functionToRun: async (wallet, notificationHandler) => {
      const recipientAddress = document.getElementById("recipientAddress");
      const amountToSend = document.getElementById("amountToSend").value;
      if (isNaN(amountToSend)) {
        notificationHandler.message(
          "Please enter a number in the amount to send field",
          "danger"
        );
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
    functionToRun: async (wallet, notificationHandler) => {
      const addressField = document.getElementById("addressField");
      addressField.select();
      addressField.setSelectionRange(0, 99999);
      document.execCommand("copy");
    }
  },
  //event listener for deleting wallet
  {
    elementId: "deleteWallet",
    event: "click",
    functionToRun: async (wallet, notificationHandler) => {
      wallet.deleteWallet();
      alert("wallet deleted");
      window.location.reload();
    }
  }
];

function docReady(fn) {
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(fn, 1);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

// localStorage.clear();
