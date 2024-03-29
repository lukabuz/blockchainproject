# CoinWallet

Made by: Luka Buzaladze 101281749

# Features

- Fully functioning bitcoin wallet that stores everything on your machine, no cloud required
- Secure, encrypted storage of private key and password within localsotrage
- Integrated bitcoin-related news feed
- Integrated crypto to usd prices feed

# Notes

- This has to be run on a browser that supports localStorage(browsers like webview do not, so it will not work on there)
- As resource loading takes a certain amount of time, the page may take a few seconds to load after the password is entered
- Getting all transactions for an active wallet takes time, as each transaction requires its own API call. There is a progress bar, but large wallets will have to wait more
- Some news articles may not come with an image, displaying "No Image" instead of the image. This is not a bug, the article just didn't specify an image in its metadata
- Sometimes the qr code takes time to load, as it has to be generated by the
- The css framework used in this project is called Bulma
- All libraries are imported via CDN

# Developer Notes

- The site has 2 main objects: the wallet and the page object
  - The wallet object
    - This object contains all the logic used for the bitcoin wallet, it implements the simple-bitcoin-wallet npm package from honest.cash
    - When constructed, it checks if a private key and password combo is stored in localStorage. If it is, it creates a wallet based on the stored key(if the given password matches the saved password). If it isnt, it creates a new private key, encrypts it with the password, and saves the encrypted string along with a hash of the password(to verify the password later)
    - Password hashes are created using a custom function added to the String prototype called hashCode
    - If the entered password is wrong, the user is repeatedly asked for a password(until he gets it right). There is not brute force prevention at this point.
    - It gets transactions from an API. The list of transactions is retrieved from the simple-bitcoin-wallet library, and then each transaction's details are retrieved from an API call to bch-chain API at btc.com
    - Deleting the wallet just clears local storage
  - The page object
    - The page object contains all the logic for loading stuff on the page, as well as the event listener registration logic
    - When constructed, it takes the wallet object, an array of event listeners(more on that later), and a notificationHandler object(also more on that later) and it initializes all the parts of the page(wallet info, news articles, crypto prices)
    - Event listeners have to be passed into the page object as an array of custom objects. These objects have three properties:
      - elementId : the id of the element the event listener is targeting
      - event : the event being listened to
      - functionToRun : the callback function for the event listener. This function will be given 2 arguments, the wallet and the notificationHandler.
  - The notification handler object
    - The notification handler object is how the modals on the page are controlled.
    - To be constructed, it needs the id of the container where notifications will be placed
    - It has a message function that can be given text, and the type of notification to be displayed. These types are the default types for Bulma's notification component(primary, link, info, success, warning, danger)
- Each page is responsible for initializing these provided objects. The initialization should be put in to a function and passed in to the docReady() function. The docReady function registers the given function to be run as soon as the page is loaded.

# Libraries Used

- [Bulma's CSS library](https://github.com/jgthms/bulma) For CSS
- [FontAwesome](https://github.com/FortAwesome/Font-Awesome) For Bulma
- [simple-bitcoin-wallet](https://www.npmjs.com/package/simple-bitcoin-wallet) For interacting with the BCH blockchain
- [crypto-js](https://www.npmjs.com/package/crypto-js) For encrypting private keys
- [faker](https://www.npmjs.com/package/faker) For creating private keys# CoinWallet
