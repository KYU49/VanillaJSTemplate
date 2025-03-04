import { Euonymus } from "./Euonymus.js";

(function(){
    // ロード時にオブジェクトだけ作成
    window.onload = function () {
        const TestVm = class extends Euonymus.ViewModel{
            text = Euonymus.state("test");
        };
        const testVm = new TestVm();
        const container = document.getElementById("container");
        const component = Euonymus.el({
            tag: "div",
            viewmodel: testVm,
            contents: function*(){
                yield Euonymus.el({
                    tag: "input", 
                    viewmodel: testVm, 
                    value: testVm.text,
                    args: {
                        type: "text",
                    }
                });
                yield Euonymus.el({
                    tag: "div", 
                    viewmodel: testVm, 
                    contents: function(){return this.text}
                });
            }
        });
        component.setParent(container);

        /*
        const test = document.getElementById("test");
        const testComp = Euonymus.el({
            tag: "div",
            viewmodel: testVm,
            contents: function(){return this.text}
        });
        testComp.setParent(test);
        */
    };
})()