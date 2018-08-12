// Extension is force to show "x is debugging this browser"
// Open Chrome and go to "chrome:\\flags" in the search bar/ address bar.
// Then search for "Silent Debugging", then click "Enable".
//
// chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
//     sendResponse({"success" : "success"});
// });


// if (typeof web3 !== 'undefined') {
//     web3 = new Web3(web3.currentProvider);
// } else {
//     // set the provider you want from Web3.providers
//     web3 = new Web3(new Web3.providers.HttpProvider("https://kovan.infura.io:443"));
// }
//
//
// function brainwallet(username, password, hardness) {
//     return web3.sha3(Array(hardness + 1).join(username + ":" + password));
// }
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function makeRequest () {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://localhost:3001/db");
    xhr.onload = function () {
        database = JSON.parse(xhr.response);
        var db = database["db"]
        for (var key in db) {
            var value = db[key];
            db[key.replaceAll("_", "/")] = value;
            delete db[key];
        }

        console.log(db)




        chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
            // if tab URL in whitelisted -> getAddress()
            if (!(tab.url in db)) {
                return;
            }
            console.log("meme")
            if (info.status != 'complete')
                return;
            let protocolVersion = '1.0';
            chrome.debugger.attach({
                tabId: tabId
            }, protocolVersion, function() {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                    return;
                }
                // 2. Debugger attached, now prepare for modifying the UA
                chrome.debugger.sendCommand({ tabId: tabId }, 'Network.enable', { maxTotalBufferSize: 10000000, maxResourceBufferSize: 100000000, maxPostDataSize: 100000000 }, function(result) {
                    if (chrome.runtime.lastError)
                        return;
                    // TODO: Seperate video requests from others. (Initial page load is too much)
                    // TODO: Not recording the video stream on twitch. maybe bcuz diff url
                    chrome.debugger.onEvent.addListener(
                        function(source, method, params) {
                            // if (!params.dataLength || params.dataLength < 480) {
                            //     return;
                            // }
                            // if (params.hasOwnProperty("response") && params.response.hasOwnProperty("url") && !params.response.url.indexOf("video") != -1 &&
                            //     params.response.hasOwnProperty("encodedDataLength") && params.response.encodedDataLength > 0) {
                            //    let data = params.response.encodedDataLength)
                            // }
                            chrome.tabs.get(source.tabId, function(tab){
                                if (tab.url in urlToDataWrap) {
                                    let dataWrapVal = urlToDataWrap[tab.url][1];
                                    // 1 index = dataWrapper
                                    //
                                    if (params.hasOwnProperty("response") && params.response.hasOwnProperty("url") && !params.response.url.indexOf("video") != -1 &&
                                        params.response.hasOwnProperty("encodedDataLength") && params.response.encodedDataLength > 0) {
                                        console.log(params.response.encodedDataLength == undefined ? 0 : params.response.encodedDataLength)
                                        dataWrapVal.increment(params.response.encodedDataLength);
                                    }

                                } else {
                                    urlToDataWrap[tab.url] = [setInterval(function(){
                                        let dataWrapVal = urlToDataWrap[tab.url][1];
                                        console.log(dataWrapVal)
                                        if (notPayed) {
                                            if ("counter" in this) {
                                                this.counter += 1
                                                console.log("Amount:" + this.counter)
                                            } else {
                                                console.log("Amount:" + this.counter)
                                                this.counter = 1;
                                            }
                                        }
                                        let self = this;
                                        //console.log(dataWrapVal);
                                        console.log(this.lastNumber)
                                        if (this.lastNumber == dataWrapVal.number) {
                                            dataWrapVal.stopCounter += 1;
                                            console.log(dataWrapVal.stopCounter)
                                            if (dataWrapVal.stopCounter > 10 && notPayed) {
                                                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                                                    console.log("Amount:" + self.counter)
                                                    ensureSendMessage(source.tabId, {ping: self.counter, address : db   [tab.url]}, function(msg) {
                                                        notPayed = false
                                                        self.counter = 0;
                                                    });
                                                });
                                                console.log("Stopped")
                                            }
                                        } else {
                                            dataWrapVal.stopCounter = 0;
                                            notPayed = true
                                            //console.log("Streaming");
                                        }

                                        this.lastNumber = dataWrapVal.number;
                                    },1000),  new DataWrapper(0)];
                                }
                                //console.log(params)
                                let popup = chrome.extension.getViews({type:"popup"});
                                if (popup.length>0){
                                    //console.log(tab.url + "; " + params.dataLength)
                                    let popupInfo = $(popup[0].document.getElementById("bytes"));
                                    let popupInfoString = ""
                                    for (var key in urlToDataWrap) {
                                        popupInfoString += "Currently watching: " + key + "<br />"
                                    }
                                    popupInfo.html(popupInfoString);
                                }
                            });
                        });

                });

            });

        });

    };
    xhr.onerror = function () {
        done(xhr.response);
    };
    xhr.send();
}

makeRequest();

function ensureSendMessage(tabId, message, callback){
    chrome.tabs.sendMessage(tabId, message, function(response){
        console.log(message)
        if(response && response.pong) { // Content script ready
            chrome.tabs.sendMessage(tabId, message, callback);
        } else { // No listener on the other end
            chrome.tabs.executeScript(tabId, {file: "content.js"}, function(){
                if(chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    throw Error("Unable to inject script into tab " + tabId);
                }
                // OK, now it's injected and ready
                chrome.tabs.sendMessage(tabId, message, callback);
            });
        }
    });
}

//TODO: https://ethereum.stackexchange.com/questions/47918/how-to-make-batch-transaction-in-ethereum
class DataWrapper {
    constructor(number) {
        this.number = number;
        this.stopCounter = 0;
    }
    increment(val) {
        this.number += val;
    }
}

class IntervalWrapper {
    constructor(interval, lastNum) {
        this.interval = interval;
        this.lastNum = lastNum;
    }
}
let urlToDataWrap = {};
let notStreamCount = 0;

let notPayed = true;

//Alternate method (works only if Content-Length response header exists

//chrome.webRequest.onCompleted.addListener(function(details) {
//         for (var i = 0; i < details.responseHeaders.length; ++i) {
//             if (details.responseHeaders[i].name === 'Content-Length') {
//                 console.log(details.url + ': ' + details.responseHeaders[i].value +
//                     'bytes');
//             }
//         }
// },
// {
//     urls:["*://*/*"]
// },
//     ["responseHeaders"])
