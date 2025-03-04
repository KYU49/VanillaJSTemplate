import { Euonymus } from "./Euonymus.js";

(function(){
    const TestVm = class extends Euonymus.ViewModel{
        text = Euonymus.state("test");
    };
    // ロード時にオブジェクトだけ作成
    window.onload = function () {
        const container = document.getElementById("container");
        const component = Euonymus.el({tag: "div", viewmodel: TestVm, contents: "${text}"});
        component.setParent(container);
    };
})()