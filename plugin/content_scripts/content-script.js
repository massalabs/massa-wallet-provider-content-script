const WALLET_PROVIDER = "SpaceXWallet";
(
  function()
  {
      //Make sure script is loaded once
      if (window.hasRun)
          return;
      window.hasRun = true;
      
      let IS_CHROME = /Chrome/.test(navigator.userAgent);
      let mybrowser = IS_CHROME ? chrome : browser;

      console.log("================ ContentScriptProxyProvider ============== ",
      window.injected.ContentScriptProxyProvider.registerAsMassaWalletProvider);


      //Listen to events from the web extension
      let sourceWindow = null; //injected page window object
      mybrowser.runtime.onMessage.addListener((message) => {
          //Send message to the injected page window
          if (sourceWindow)
          sourceWindow.postMessage(message);
      });
  
      //Listen to messages from the injected window.massa to send to the web extension [injected window.massa --> ext]
      //The window object is the web extension one (not the same as injected page window object)
      window.addEventListener('message', function(event) 
      {        
        
          if (event.data.type === 'massa_register_window')
          {
              sourceWindow = event.source; // save the injected page window
              return;
          }

          if (event.data.type === 'ABC')
          {
            console.log("ABC MESSAGE ", event.data.type);
            return;
          }


          console.log("Got a Message from Massa Injected. Sending to Extension... ", event.data.type);
  
          //call web extension
          const massaFilter = 'massa:';
          if (typeof(event.data.type) == 'string' && event.data.type.substring(0, massaFilter.length) == massaFilter)
          {
              mybrowser.runtime.sendMessage({action: event.data.type.substring(massaFilter.length), params: event.data.params, msgId: event.data.msgId}, (response) => {
                  //send response to the page
                  event.source.postMessage({ 'type': 'web_extension_res', msgId: event.data.msgId, response }, event.origin);
              } );
          }
      });
  
      //Inject window.massa [MUST BE THE MASSA_WALLET_PROVIDER LOADED INTO THE DAPP HTML]
      ((source)=>{
          const script = document.createElement("script");
          script.text = `(${source.toString()})();`;
          document.documentElement.appendChild(script);
        })(function (){
          
          class MassaWalletClient
          {
              constructor(name)
              {
                this.client = window.wallet.ContentScriptProxyClient.getInstance();
                this.name = name;
                this.resolveCallback = {};
                this.getBalance = this.getBalance.bind(this);
              }

              async getBalance(params)
              {
                  return await this.sendMessage('getBalance', params);
              }
  
              //Dapp use this in wrappers to send message to web extension e.g. getBalance
              async sendMessage(type, params)
              {                  
                  return new Promise((resolve) => {
  
                      //Store resolve callback
                      let msgId = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 5);
                      this.resolveCallback[msgId] = resolve;
  
                      //Send message to the web extension
                      type = 'massa:' + type; //allow to filter message for the web extension
                      window.postMessage({ type, params, msgId }, '*');
                  });
              }
          }
          
          window.massa = new MassaWalletClient("SpaceXWallet");
  
          //Listen to response from the web extension
          window.addEventListener('message', function(event) {

              if (event.data.type != 'web_extension_res')
                  return;

              console.log("Got a response from Web Extension ", event.data);

              if (!window.massa.resolveCallback.hasOwnProperty(event.data.msgId))
              {
                  //console.log('message already treated');
                  return;
              }

              //Call resolve callback
              window.massa.resolveCallback[event.data.msgId](event.data.response);
              //Clean it from memory
              delete window.massa.resolveCallback[event.data.msgId]
          });
  
          //Register window
          window.postMessage({ type: 'massa_register_window' }, '*');
        })
  })();
  