/*
*   MIT License
* 
*   Copyright (c) 2025 KYU @ https://github.com/KYU49
*
*   Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
*   and associated documentation files (the "Software"), to deal in the Software without 
*   restriction, including without limitation the rights to use, copy, modify, merge, publish, 
*   distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the 
*   Software is furnished to do so, subject to the following conditions:
*
*   The above copyright notice and this permission notice shall be included in all copies or 
*   substantial portions of the Software.
*
*   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
*   BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
*   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
*   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
*   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*
*   You should have received a copy of the The MIT License
*   along with this program.  If not, see <https://opensource.org/license/mit>.
*/


// 参考 Vue.js: https://unpkg.com/vue@3.0.0/dist/vue.global.js
const Euonymus = (function(exports){
	/**
	 * objectをProxyにして返す役割。！！もしかすると、classにする必要があるかも？初めて値が呼び出される際に、呼び出し元のcomponentを記録し、必要に応じて双方向bindingを設定する必要がある。
	 * @param {object} viewmodel この中身をProxyにぶち込む
	 */
	const ViewModel = function(viewmodel){
		return new Proxy(viewmodel, {
			get(target, prop, receiver){
				//TODO getが走った際に、そのgetを呼び出したオブジェクト(this)の情報を読み取ることはできるか？
			}
		});
	};

	/**
	 * メインとなるviewを生成するためのfunction。直接オブジェクトを渡せばいいんだけど、関数定義することで補完が効くようにしている。
	 * @param {string} tag aやらdivやらspanやら。viewmodelを使った指定不可。
	 * 					↓やっぱり、ViewModelはViewModelを継承したclassとして実装させて、依存性注入的にsingletonで生成すべき。
	 * @param {object} viewmodel { visible: new State(true), fontsize: new State(10), click: (e) => {visible = !visible} }のような形で渡す。
	 * @param {() => Generator<Component, void, void> | string} contents function*(vm){}を入れて、Viewをjsで指定していく。yieldでComponentを返す。stringでinnerHTMLを指定することも可能で、viewmodel内の変数なら、テンプレートリテラルのように"名前は<b>${vm.name}</b>です。"のような指定も可能。
	 * @param {object} style {display: "block"}のように指定可能。ただし、"10px"などを含む文字列の場合は""で括る必要がある。右辺にはstateも利用でき、{size: "${vm.fontsize}px"}といった指定も可能。
	 * @param {[string]} classList classは予約語のため、classList。"${vm.visible} ? 'visible' : 'hidden'"のような設定をすることも可能。
	 * @param {(Event) => void | [(Event) => void]} events eventsを{type: "change", callback: click}の形で指定するか、それを含む配列を指定。
	 * @param {object} args aでのhrefや、imgでのsrcやaltなど、任意指定可能だが、{}で指定が必要。{href: "https://~", checked: vm.checked}など。※vm.checkedは実際にはvm.checked.valueを参照しない限りはobjectのため、内部データの変更にも対応できる。
	 * @return {object} 2回目以降は再生成しない。vm.fontsizeなどの内部の値は変化するが、渡される変数自体は変化しないため。
	 */
	const el = function(
		tag = "section",
		viewmodel = {},
		contents = "",
		style = {},
		classList = [],
		events = [],
		args = {}
	){
		return {tag: tag, viewmodel: viewmodel, contents: contents, style: style, classList: classList, events: events, args: args};
	};

	const Component = class{
		/** @type {boolean} componentを描画済みならtrue。trueの場合、値だけ変更して、前回のcomponentを再利用する */
		#composed = false;
		/** @type {Element} コンポーネントのroot element */
		el = null;
		/** @type {ParentElement | null} 親のDOM element*/
		#parentElement = null;
		/** @type {Component[]} 子コンポーネントのinstance */
		#children = [];
		/** @type {string} htmlタグの要素aとかdivとか */
		#tag;
		/** @type {ViewModel} viewmodel。Proxyをwrapした独自classを返すfunctionを入れる？未定 */
		#viewmodel;
		
		contents;
		#style;
		#classList;
		#events;
		#args;
		id;
		static getUniqueId = (() => {
			let currentId = 0;
			const map = new WeakMap();
			return (object) => {
				if (!map.has(object)) {
					map.set(object, ++currentId);
				}
				return map.get(object);
			};
		})();

		constructor(tag, viewmodel, contents, style, classList, events, args){
			this.#tag = tag;
			this.#viewmodel = viewmodel;
			this.contents = contents;
			this.#style = style;
			this.#classList = classList;
			this.#events = events;
			this.#args = args;

			this.id = Component.uniqueIds(this);
			this.el = document.createElement(tag);
		}

		/**
		 * 描画を行うためにcontentsの中に置かれたComponentの描画を実行する。viewmodelから通知があれば、再度呼ばれる。
		 */
		compose(){
			if(this.contents instanceof string){
				this.el.innerHTML = templateLiteral(this.contents, this.#viewmodel);
			} else {
				if(this.#composed){
					//TODO 一度でも実行されている場合は再描画。
					for(const content of this.contents){
						const {tag, viewmodel, contents, style, classList, events, args} = content;
						//TODO 前回のcontentと異なる場合は、#childrenの同一と思われる要素と比較して見直す？
					}
				} else {
					// 初実行の場合は全部描画する
					for(const content of this.contents){
						const {tag, viewmodel, contents, style, classList, events, args} = content;
						const component = new Component(tag, viewmodel, contents, style, classList, events, args);
						component.compose();	//TODO viewmodelがthisになるようにapplyとかで調整すること。
						this.#children.push(component);
						this.el.appendChild(component.el);
					}
				}
				
			}
			//TODO styleなどの適用。また、このcomponentへの参照と、どういった要素に登録されたかをその際に使った変数に記録させる必要がある(あとで呼び出せるように)。
		}

		/**
		 * どのDOM elementの下にこのComponent elementを置くか？
		 * @param {ParentElement} parent 
		 */
		setRoot(root){
			if(this.#parentElement == null){
				this.#parentElement = parent;
				parent.append(this.el);
			} else {
				console.warn(`Element ${this.#tag} has been already assigned to another parent element.`);
			}
		}
	}
	// 同じelをリスト的に描画するために使用。
	const Column = function(){

	};

	/**
	 * テンプレートリテラル様に書かれた文字列を展開する。
	 * @param {string} originalText 置き換えたいテキスト。"My name is ${name}."のように記載(`を使わないこと)。"${"と記載したい場合は"$${"でエスケープされる。
	 * @param {object} viewmodel 置き換えたいテキストの置き換え先を格納したobject。nameを置換したければ、viewmodel = {name: "MyName"}と記載。
	 * @returns {string}
	 */
	const templateLiteral = (originalText, viewmodel) => {
		return escapedText.replace(/(?<!\$)\$\{(.*?)\}/g, (_, key) => viewmodel[key.trim()] || "").replace(/\$\$\{/g, "${");
	}

"aaa${test}aaa"

	
	exports.el = el;
	return exports;
}({}));
