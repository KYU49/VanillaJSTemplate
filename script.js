import { Euonymus } from "./Euonymus.js";

(function(){
    // ロード時にオブジェクトだけ作成
    window.onload = function () {
        const TestVm = class extends Euonymus.ViewModel{
            text = Euonymus.state("test");
            check = Euonymus.state(false);
        };
        const testVm = new TestVm();
        const container = document.getElementById("container");
        const component = Euonymus.el({
            tag: "div",
            viewmodel: testVm,
            contents: function*(viewmodel){
                yield Euonymus.el({
                    tag: "input", 
                    viewmodel: testVm, 
                    value: testVm.check,
                    args: {
                        type: "checkbox",
                    }
                });
                yield Euonymus.el({
                    tag: "input", 
                    viewmodel: testVm, 
                    value: testVm.text,
                    args: {
                        type: "text",
                    }
                });
                if(viewmodel.check){
                    yield Euonymus.el({
                        tag: "div", 
                        viewmodel: testVm, 
                        contents: "Checked!"
                    });
                }
                yield Euonymus.el({
                    tag: "div", 
                    viewmodel: testVm, 
                    contents: (viewmodel) => {return viewmodel.text}
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