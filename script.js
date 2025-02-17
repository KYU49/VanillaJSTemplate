(function(){

    // ViewでaddEventListnerなどを記述した際は、EventDispatcherにcallbackをつけて登録する。クリックイベントなどをトリガーにDispatcherを介して、Controllerが呼び出され、ControllerがModelのメソッドを呼び出し、結果がcallback関数に渡される。
    class EventDispatcher {
        constructor (){
            this.listeners = {};
            const ADD = "add";
        }
        addEventListener(type, callback){
            if(!this.listeners[type]){
                this.listeners[type] = [];
            }
            this.listeners[type].push(callback);
        }
        removeEventListener(type, callback){
            for(let i = this.listeners[type].length - 1; i >= 0; i--){
                if(this.listeners[type][i] == callback){
                    this.listeners[type].splice(i, 1);
                }
            }
        }
        clearEventListener(){
            this.listeners = [];
        }
        /**
         *  ディスパッチイベントの実行
         *  @param {type, [args]} event
        */
        dispatchEvent(type, ...args){
            const tempListeners = this.listeners[type];
            if(tempListeners){
                for(let listener in tempListeners){
                    tempListeners[listener].apply(this.listeners, args);
                    // applyの参考: https://devsakaso.com/javascript-bind-call-apply-methods/
                    //              https://ginpen.com/2017/12/17/rest-parameters/
                }
            }
        }
    }

    // ステートを保存。Controllerからの要求で、外部からのデータ取得。ステートの変更。View, Controllerは見えない。
    class Model extends EventDispatcher {
        query = new DataBinding("");
        hide = new DataBinding(false);
        disabled = new DataBinding(false);
        static get CONST() {
            return {
                VALUE_CHANGED: "VALUE_CHANGED",
            };
        }
        constructor(){
            super();
            const self = this;
        }

        submitValue(value = 1){
            // 普通はWeb関連の処理がここに入るため、modelで実行。
            const result = 2;
            this.dispatchEvent(Model.CONST.VALUE_CHANGED, value, result);
        }
    }
    
    // ViewとModelを双方向に繋ぐ。
    class Controller extends EventDispatcher{
        static get CONST() {
            return {
                ON_LOAD: "ON_LOAD",
            };
        }
        constructor(model){
            super();
            this.model = model;
            const self = this;
        }

        // submitの発火をViewから受け取って、modelの数値を読み込んで、modelのsubmitを実行。
        submit(){
            const value = this.model.query.value;
            this.model.submitValue(value);
        }

        onload(){
        }
    }
    class View extends EventDispatcher {
        static get CONST() {
            return {
            };
        }
        constructor(model, controller) {
            super();
            const self = this;
            this.model = model;
            this.controller = controller;

            // modelからこのView操作を呼び出せるようにする見本
            this.model.addEventListener(Model.CONST.VALUE_CHANGED, (value1, value2) => {
                alert(value1 + ", " + value2);
            });

            // modelの値を呼び出してsubmit。
            document.forms.testForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.controller.submit();
            });

            // bindingの見本
            this.model.query.bindElement(document.forms.testForm.testText);
            this.model.hide.bindElement(
                new DataBinding.BoundCheckbox(document.forms.testForm.testCheck)
            );
            this.model.hide.bindElement(
                new DataBinding.BoundInvisible(document.forms.testForm.testText)
            );
            this.model.hide.bindElement(
                new DataBinding.BoundDisabled(document.forms.testForm.testButton)
            );
        }
    }
    // MVCをまとめるだけ。
    class App {
        constructor(){
            const model = new Model();
            const controller = new Controller(model);
            const view = new View(model, controller);
            controller.onload();
        }
    }
    // ロード時にオブジェクトだけ作成
    window.onload = function () {
        let app = new App();
    };
})()