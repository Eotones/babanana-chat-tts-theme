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

        if (localStorage.getItem("ls_rate") === null) {
            this.u_rate = 1.2; // 語速 0.1~10
        } else {
            this.u_rate = Number(localStorage.getItem("ls_rate"));
        }

        if (localStorage.getItem("ls_volume") === null) {
            this.u_volume = 0.5; //音量 0~1
        } else {
            this.u_volume = Number(localStorage.getItem("ls_volume"));
        }

        if (localStorage.getItem("ls_pitch") === null) {
            this.u_pitch = 1; //語調 0.1~2
        } else {
            this.u_pitch = Number(localStorage.getItem("ls_pitch"));
        }
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
                    return this._tw_voice;
                    //break;
                } else if (voices[index].name == "Google 國語（臺灣）") { //Chrome專用
                    //console.log("Y");
                    //this.u.lang = 'zh-TW';
                    //u.voice = voices[index];
                    this._tw_voice = voices[index];
                    return this._tw_voice;
                    //break;
                } else {
                    //console.log("N");
                    //u.lang = 'zh-TW';
                    this._tw_voice = false;
                    return this._tw_voice;
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
                u.lang = 'zh-TW';
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

    // speak2_old(textToSpeak) {
    //     if (textToSpeak !== null) {
    //         if (textToSpeak.length > 0) {
    //             let filter_text = this._textFilter(textToSpeak);

    //             console.log('[將要唸的語音]', filter_text);

    //             if(filter_text.length > 0){
                    

    //                 try{
    //                     //console.log(document.getElementById("ttsCheck").checked == true ? "[語音開啟]" : "[語音關閉]");
    //                     //let that = this;

    //                     //
    //                     //this.u = null;
    //                     let u = new SpeechSynthesisUtterance();

    //                     u.rate = this.u_rate;
    //                     u.volume = this.u_volume;
    //                     u.pitch = this.u_pitch;

    //                     u.text = filter_text;

    //                     u.onend = (event) => {
    //                         //console.log(event.utterance.text);
    //                         this.last_tts = event.utterance.text;
    //                         console.log("tts.onend", event.utterance.text);
    //                     };

    //                     u.onerror = (event) => {
    //                         //console.log(event);
    //                         console.log("tts.onerror", event);
    //                         this.cancel2();
    //                     };

    //                     //
    //                     let voices = this.synth.getVoices();
    //                     for (let index = 0; index < voices.length; index++) {
    //                         /*
    //                         "Google US English"
    //                         "Google 日本語"
    //                         "Google 普通话（中国大陆）"
    //                         "Google 粤語（香港）"
    //                         "Google 國語（臺灣）"
    //                         */

    //                         //console.log(this.voices[index].name);

    //                         if (voices[index].name == "Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)") { //HsiaoChen (Neural) - 曉臻 (MS Edge專用)
    //                             u.voice = voices[index];
    //                             break;
    //                         } else if (voices[index].name == "Google 國語（臺灣）") { //Chrome專用
    //                             //console.log("Y");
    //                             //this.u.lang = 'zh-TW';
    //                             u.voice = voices[index];
    //                             break;
    //                         } else {
    //                             //console.log("N");
    //                             u.lang = 'zh-TW';
    //                         }
    //                     }

    //                     //console.log("test");

    //                     u.onstart = (event) => {
    //                         //console.log(event.utterance);
    //                         //console.log("tts.onstart", filter_text);

    //                         console.log("tts.onstart", event.utterance.text);
    //                         if (event.utterance.text === this.last_tts) {
    //                             window.speechSynthesis.cancel();
    //                             console.log("tts.cancel", event.utterance.text);
    //                         }
    //                     };
                        
    //                     this.synth.speak(u);
    //                 }catch (e){
    //                     console.log(e);
    //                 }
                    
    //             }
    //         }
    //     }

    //     //return this;
    // }

    cancel2() {
        console.log("tts cancel");
        window.speechSynthesis.cancel();

        //防bug卡死
        this.tts_queue = [];

        this.tts_state = "idle"; // idle, speaking

        this.stop_tts();
    }

    volume(volume_val) {
        let volume = Number(volume_val);
        if (volume >= 0 && volume <= 1) {
            this.u_volume = volume;
            localStorage.setItem("ls_volume", volume);
            console.log(`音量調整為: ${this.u_volume}`);
        } else {
            console.log(`超出範圍`);
        }
    }
    rate(rate_val) {
        let rate = Number(rate_val);
        if (rate >= 0.5 && rate <= 2) {
            this.u_rate = rate;
            localStorage.setItem("ls_rate", rate);
            console.log(`語速調整為: ${this.u_rate}`);
        } else {
            console.log(`超出範圍`);
        }
    }
    pitch(pitch_val) {
        let pitch = Number(pitch_val);
        if (pitch >= 0.1 && pitch <= 2) {
            this.u_pitch = pitch;
            localStorage.setItem("ls_pitch", pitch);
            console.log(`語調調整為: ${this.u_pitch}`);
        } else {
            console.log(`超出範圍`);
        }
    }
    reset() {
        //localStorage.clear();
        localStorage.removeItem("ls_volume");
        localStorage.removeItem("ls_rate");
        localStorage.removeItem("ls_pitch");

        this.u_rate = 1.2; // 語速 0.1~10
        this.u_volume = 0.5; //音量 0~1
        this.u_pitch = 1; //語調 0.1~2
    }

    _textFilter(msg) {
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
