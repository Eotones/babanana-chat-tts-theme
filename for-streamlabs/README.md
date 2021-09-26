# BABANANA Chat TTS Theme for Streamlabs

這個Streamlabs實況平台聊天室樣式主題是將聊天室中的文字自動轉換成語音讀出，必須使用最新版的Chrome或Edge(Chrumium版)開啟聊天室網頁才能完整支援中文語音。
Streamlabs目前有支援的實況平台都可以使用(Twitch,Youtube,Facebook)。
若使用OBS開啟此網頁時會自動隱藏語音介面，所以不會影響原本OBS聊天室畫面的使用。(因為Streamlabs一次只能使用一種樣式主題，所以才加了此判定)

## 使用步驟
 * 1: 開啟Streamlabs的設定網頁: https://streamlabs.com/dashboard#/chatbox
   * 1-2: (Streamlabs有中文版的選項可以切換)
 * 2: 啟用自訂 HTML/CSS --> Enabled(啟用)
 * 3: 按照順序修改HTML,CSS,JS內容
 * 4: 修改完後到最底下點選 **儲存設定**
 * 5: 請使用Chrome或Edge(Chrumium版)開啟Streamlabs的小部件超連結 `https://streamlabs.com/widgets/chat-box/v1/********************`
   * 5-1: 若前面已經開啟過的話請用ctrl+f5重新載入


### HTML
```html
<!-- item will be appened to this layout -->
<div id="log" class="sl__chat__layout">
</div>

<!-- tts -->
<div id="tool">
  <h3 id="ba_title">BABANANA Chat TTS Theme <br>for Streamlabs</h3>
  <div class="ttsdiv"><label for="ttsCheck"><input type="checkbox" id="ttsCheck"> Text to Speech</label></div>
</div>

<!-- chat item -->
<script type="text/template" id="chatlist_item">
  <div data-from="{from}" data-id="{messageId}">
    <span class="meta" style="color: {color}">
      <span class="badges">
      </span>
      <span class="name">{from}</span>
    </span>

    <span class="message">
      {message}
    </span>
  </div>
</script>
```

### CSS
```css
@import url(https://fonts.googleapis.com/css?family=Roboto:700);

* {
    box-sizing: border-box;
}

html, body {
    height: 100%;
    overflow: hidden;
}

body {
    text-shadow: 0 0 1px #000, 0 0 2px #000;
    background: {background_color};
    font-family: 'Roboto';
    font-weight: 700;
    font-size: {font_size};
    line-height: 1.5em;
    color: {text_color};
}

#log>div {
    animation: fadeInRight .3s ease forwards, fadeOut 0.5s ease {message_hide_delay} forwards;
    -webkit-animation: fadeInRight .3s ease forwards, fadeOut 0.5s ease {message_hide_delay} forwards;
}

.colon {
    display: none;
}

#log {
    display: table;
    position: absolute;
    bottom: 0;
    left: 0;
    padding: 0 10px 10px;
    width: 100%;
    table-layout: fixed;
}

#log>div {
    display: table-row;
}

#log>div.deleted {
    visibility: hidden;
}

#log .emote {
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    padding: 0.4em 0.2em;
    position: relative;
}

#log .emote img {
    display: inline-block;
    height: 1em;
    opacity: 0;
}

#log .message,#log .meta {
    vertical-align: top;
    display: table-cell;
    padding-bottom: 0.1em;
}

#log .meta {
    width: 35%;
    text-align: right;
    padding-right: 0.5em;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
}

#log .message {
    word-wrap: break-word;
    width: 65%;
}

.badge {
    display: inline-block;
    margin-right: 0.2em;
    position: relative;
    height: 1em;
    vertical-align: middle;
    top: -0.1em;
}

.name {
    margin-left: 0.2em;
}

/* tts */
body[data-isobs="false"] {
  background-color: #333;
}
[data-isobs="true"] #tool {
  display: none;
}
[data-isobs="false"] #tool {
  display: block;
}
#tool {
    position: fixed;
    top: 10px;
    right: 10px;
    
    background-color: rgba(255, 255, 255, 0.8);
    
    box-sizing: border-box;
    width: 190px;
    /*min-height: 100px;*/
    padding: 0px;
    
    border-radius: 5px 5px 4px 4px;
    
    color: #000;
    text-shadow: none;
    font-weight: normal;
}

h3#ba_title {
    font-size: 10px;
    margin: 0 0 10px 0;
    padding: 10px;
    font-weight: normal;
    
    border-radius: 4px 4px 0 0;
    
    color: #fff;
    background-color: rgb(20, 30, 30);
}
.ttsdiv {
    padding: 10px 10px 20px 10px;
    font-size: 16px;
}

```

### JS
```javascript
class tts2 {
    constructor() {
        console.log("tts constructor");
        window.speechSynthesis.cancel(); //強制中斷之前的語音
        this.synth = window.speechSynthesis;
        this.v_index = 0;

        this.last_tts = ""; //最後一次唸出的語音,用來檢查是否重複(簡單防洗版功能)

        this.tts_queue = []; //待讀的語音列隊
        this.tts_queue_limit = 10; //列隊數量上限(避免訊息越積越多唸不完)

        this.tts_state = "idle"; // idle, speaking

        this._tw_voice = null;

        //

        this.u_rate = 1.2; // 語速 0.1~10

        this.u_volume = 0.5; //音量 0~1

        this.u_pitch = 1; //語調 0.1~2
    }

    //使用非瀏覽器原生的語音列隊(開始)
    start_tts(){
        if (document.getElementById("ttsCheck").checked == true){
            this.tts_timer = setInterval(()=>{
                this.tts_queue_check();
            }, 500);
        }
    }

    //使用非瀏覽器原生的語音列隊(停止)
    stop_tts(){
        console.log('[clear timer]', this.tts_timer)
        clearInterval(this.tts_timer);
    }

    // tts_next_msg(){
    //     this.tts_queue_check();
    // }

    tts_queue_check(){
        //console.log('[tts queue]', this.tts_queue.length);
        
        //正在唸語音時狀態為"speaking" (語音卡bug導致不唸時狀態會維持在"speaking",所以要用其他方式來檢查是否卡bug,目前解法是檢查語音列隊中的數量,太高時則重置語音和列隊)
        //唸完時會切換成"idle"
        //使用setInterval持續檢查狀態,當狀態為"idle"時才會唸下一句語音
        if(this.tts_queue.length > 0 && this.tts_state === "idle"){
            this.tts_queue_shift();
        }

        //防bug卡死(語音列隊中的數量堆積到上限時則強制中斷語音,並清空列隊,然後重新開始)
        if(this.tts_queue.length > this.tts_queue_limit){
            console.log('[tts queue] 重置語音', this.tts_queue.length);
            
            this.cancel2();

            this.start_tts();
        }
    }

    //從語音列隊中移出一則訊息,並送入瀏覽器原生的文字轉語音功能
    tts_queue_shift(){
        this.tts_speak(this.tts_queue[0]);

        this.tts_queue.shift();
    }

    //推入一則訊息到語音列隊中
    tts_queue_push(tts_msg){
        this.tts_queue.push(tts_msg);
    }

    //取得TW中文語音
    get_tw_voice(){
        if(this._tw_voice === null || this._tw_voice === false){
            //因為瀏覽器載入語音列表常有延遲(可能有數分鐘以上),所以在 this._tw_voice === false 時還是會繼續嘗試重新取得語音列表(在每次唸語音前嘗試)
            //目前語音主要使用者皆為Google Chrome或Chrumium Edge,例外瀏覽器暫不處理

            let voices = this.synth.getVoices();
            for (let index = 0; index < voices.length; index++) {
                /*
                "Google US English"
                "Google 日本語"
                "Google 普通话（中国大陆）"
                "Google 粤語（香港）"
                "Google 國語（臺灣）"
                */

                //console.log(this.voices[index].name);

                if (voices[index].name == "Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)") { //HsiaoChen (Neural) - 曉臻 (MS Edge專用)
                    //u.voice = voices[index];
                    this._tw_voice = voices[index];
                    return voices[index];
                    //break;
                } else if (voices[index].name == "Google 國語（臺灣）") { //Chrome專用
                    //console.log("Y");
                    //this.u.lang = 'zh-TW';
                    //u.voice = voices[index];
                    this._tw_voice = voices[index];
                    return voices[index];
                    //break;
                } else {
                    //console.log("N");
                    //u.lang = 'zh-TW';
                    //this._tw_voice = null;
                    return null;
                }
            }
        }else{
            return this._tw_voice;
        }
    }

    tts_speak(tts_msg){
        try{
            //console.log(document.getElementById("ttsCheck").checked == true ? "[語音開啟]" : "[語音關閉]");
            //let that = this;

            //
            //this.u = null;
            let u = new SpeechSynthesisUtterance();

            u.rate = this.u_rate;
            u.volume = this.u_volume;
            u.pitch = this.u_pitch;

            u.text = tts_msg;

            u.onstart = (event) => {
                //console.log(event.utterance);
                //console.log("tts.onstart", filter_text);

                this.tts_state = "speaking"; // idle, speaking

                console.log("tts.onstart", event.utterance.text);
                if (event.utterance.text === this.last_tts) {
                    window.speechSynthesis.cancel();
                    console.log("tts.cancel", event.utterance.text);
                }
            };

            u.onend = (event) => {
                //console.log(event.utterance.text);
                this.last_tts = event.utterance.text;
                console.log("tts.onend", event.utterance.text);

                this.tts_state = "idle"; // idle, speaking
            };

            u.onerror = (event) => {
                //console.log(event);
                console.log("tts.onerror", event);
                this.cancel2();
            };

            //取得語音
            let tw_voice = this.get_tw_voice();
            if(tw_voice === null || tw_voice === false){
                u.lang = 'zh-TW'; //可能有bug
            }else{
                u.voice = tw_voice;
            }

            //瀏覽器原生文字轉語音
            this.synth.speak(u);
        }catch (e){
            console.log(e);
        }
    }

    //new
    speak2(textToSpeak){
        if (textToSpeak !== null) {
            if (textToSpeak.length > 0) {
                let filter_text = this._textFilter(textToSpeak); //字串過濾

                if(filter_text.length > 0){
                    // if(typeof this.tts_timer === 'undefined') this.start_tts();
                    
                    this.tts_queue_push(filter_text);
                }
            }
        }
    }

    cancel2() {
        console.log("tts cancel");
        window.speechSynthesis.cancel();

        //防bug卡死
        this.tts_queue = [];

        this.tts_state = "idle"; // idle, speaking

        this.stop_tts();
    }

    _textFilter(msg) {
        msg = msg.trim(); //去除前後空白
        
        //網址不唸
        //msg = msg.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g, "網址");
        msg = msg.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g, "");

        //全形轉半形
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
        msg = msg.normalize('NFKC');

        //過濾掉中文,英文,數字,半形空白以外的所有字元
        msg = msg.replace(/[^0-9a-z\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF ]/ig, ""); // *不要用\s取代空白,因為\s包含全形空白

        msg = msg.trim(); //去除前後空白

        msg = msg.replace(/^(1){4,}$/g, "一一一");
        msg = msg.replace(/^(2){4,}$/g, "二二二");
        msg = msg.replace(/^(3){4,}$/g, "三三三");
        msg = msg.replace(/^(4){4,}$/g, "四四四");
        msg = msg.replace(/^(5){4,}$/g, "五五五");
        msg = msg.replace(/^(6){4,}$/g, "六六六");
        msg = msg.replace(/^(7){4,}$/g, "七七七");
        msg = msg.replace(/^(8){4,}$/g, "八八八");
        msg = msg.replace(/^(9){4,}$/g, "九九九");

        msg = msg.replace(/^(w){4,}$/gi, "哇拉");
        //msg = msg.replace(/^(~){3,}$/g, "~~~");
        //msg = msg.replace(/^(\.){3,}$/g, "...");

        msg = msg.replace(/^484$/gi, "四八四");
        msg = msg.replace(/^87$/g, "八七");
        msg = msg.replace(/^94$/g, "九四");
        msg = msg.replace(/^9487$/g, "九四八七");

        return msg;
    }

    _textFilter_old(msg) {
        //網址不唸
        //msg = msg.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g, "網址");
        msg = msg.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g, "");

        msg = msg.replace(/^(1){4,}$/g, "一一一");
        msg = msg.replace(/^(2){4,}$/g, "二二二");
        msg = msg.replace(/^(3){4,}$/g, "三三三");
        msg = msg.replace(/^(4){4,}$/g, "四四四");
        msg = msg.replace(/^(5){4,}$/g, "五五五");
        msg = msg.replace(/^(6){4,}$/g, "六六六");
        msg = msg.replace(/^(7){4,}$/g, "七七七");
        msg = msg.replace(/^(8){4,}$/g, "八八八");
        msg = msg.replace(/^(9){4,}$/g, "九九九");

        msg = msg.replace(/^(w){4,}$/gi, "哇拉");
        msg = msg.replace(/^(~){3,}$/g, "~~~");
        msg = msg.replace(/^(\.){3,}$/g, "...");

        msg = msg.replace(/^484$/gi, "四八四");
        msg = msg.replace(/^87$/g, "八七");
        msg = msg.replace(/^94$/g, "九四");
        msg = msg.replace(/^9487$/g, "九四八七");

        //過濾掉全形符號(防edge bug)
        msg = msg.replace(/[\uFF01-\uFF5E]/g, "");

        //過濾emoji(最多3個,超過就刪除)
        msg = msg.replace(/(\ud83d[\ude00-\ude4f]){4,}/g, "");

        //過濾標點符號 (Punctuation & Symbols)
        msg = msg.replace(/[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]/g, "");

        return msg;
    }
}

//

const tts = new tts2();
//tts2.init();
/*
tts.speak2("大家看到我，就知道我是誰了，我就是歐付寶終結者RRRRRRRRRRRRRRRRRRRRR");
tts.speak2("測試1");
tts.speak2("測試2");
tts.speak2("測試3");
tts.speak2("測試4");
tts.speak2("測試5");
*/


const isOBS = function(){
  if(typeof window.obsstudio !== 'undefined'){
    // is OBS browser
    return true;
  }else{
    // other browser
    return false;
  }
};

// Please use event listeners to run functions.
document.addEventListener('onLoad', function(obj) {
	// obj will be empty for chat widget
	// this will fire only once when the widget loads
  if(isOBS() === true){
    //document.body.classList.toggle('isOBS', true);
    document.body.dataset.isobs = true;
  }else{
    //document.body.classList.toggle('isOBS', false);
    document.body.dataset.isobs = false;
    
    const ttsCheck = document.getElementById("ttsCheck");
    ttsCheck.addEventListener('change', function (e) {
      if (e.target.checked) { //checked
        console.log("#ttsCheck true");
        tts.start_tts();
      } else { //not checked
        console.log("#ttsCheck false");
        tts.cancel2();
      }
    });
  }
});

document.addEventListener('onEventReceived', function(obj) {
  // obj will contain information about the event
	//console.log('[onEventReceived]', obj);
  if (obj.detail.command == 'PRIVMSG' || obj.detail.command == 'youtube#liveChatMessage' || obj.detail.command == 'ChatMessage') { // twitch,yt,fb
    if(ttsCheck.checked == true){
    	console.log('[onEventReceived]', obj);
    	tts.speak2(obj.detail.body);
    }
  }
});

```