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
export const Euonymus = (function(exports){
	
	/**
	 * State classを返すだけ。
	 * @param {any} initialValue 
	 * @returns {State}
	 */
	function state(initialValue){
		return new State(initialValue);
	}
	/**
	 * KotlinでいうところのmutableState。ViewModel内でのみ使用可能。getterやsetterはViewModel内で実装する。
	 * @param {any} initialValue 
	 */
	const State = class {
		listeners = [];
		value = null;
		constructor(initialValue){
			this.value = initialValue;
		}
	}
	// 必ず継承して使うこと。
	const ViewModel = class {
		constructor() {
			// Singletonにする。
			if (!ViewModel.instance){
				ViewModel.instance = this;
			}
			return ViewModel.instance;
		}

		/**
		 * reflectXXX.apply(accessorWithListener(this.reflectXXX))という形で呼び出すことで、Stateに呼び出し元を登録できる。
		 * @param {() => void} callerFunction 呼び出し元のreflect関数 or compose関数。
		 * @returns {() => *} 
		 */
		accessorWithListener = (callerFunction) => {
			const caller = callerFunction;
			const self = this;
			return new Proxy({}, {
				get: (target, prop, reveiver) => {
					if(self[prop] && self[prop] instanceof State){	// ViewModel内に標的のstateが存在するか？
						// 呼び出し元を記憶するため、currentJobをlistenerに登録し、propertyにsetが実行されたら、そのlistenerを呼び出せるようにする。
						if(caller && !caller in self[prop].listeners){	// 既に追加済なら再追加の必要はない。
							self[prop].listeners.append(caller);
						}
						return self[prop].value;
					}
					console.error(`There is no State named "${prop}" in ViewModel.`);
					return undefined;
				},
				set: (target, prop, newValue, receiver) => {
					if(self[prop] && self[prop] instanceof State) {
						if (self[prop].value != newValue){
							self[prop].value = newValue;
							for (job of listeners) {	// 一度でも呼び出されたことがあるものを全て実行
								job.call();
							}
						}
					} else {
						if(newValue instanceof State){
							self.prop.value = newValue;
						} else {
							self.prop = new State(newValue);
						}
					}
				}
			});
		};
	};

	/**
	 * メインとなるviewを生成するためのfunction。直接オブジェクトを渡せばいいんだけど、関数定義することで補完が効くようにしている。
	 * @param {string} tag aやらdivやらspanやら。viewmodelを使った指定不可。
	 * @param {ViewModel} viewmodel ViewModelを継承したclassを渡す。
	 * @param {() => Generator<Component, void, void> | string} contents function*(vm){}を入れて、Viewをjsで指定していく。yieldでComponentを返す。stringでinnerHTMLを指定することも可能で、viewmodel内の変数なら、テンプレートリテラルのように"名前は<b>${vm.name}</b>です。"のような指定も可能。
	 * @param {object} style {display: "block"}のように指定可能。ただし、"10px"などを含む文字列の場合は""で括る必要がある。右辺にはstateも利用でき、{size: "${fontsize}px"}といった指定も可能。
	 * @param {[string]} classList classは予約語のため、classList。"${visible} ? 'visible' : 'hidden'"のような設定をすることも可能。
	 * @param {(Event) => void | [(Event) => void]} events eventsを{type: "change", callback: click}の形で指定するか、それを含む配列を指定。
	 * @param {object} args aでのhrefや、imgでのsrcやaltなど、任意指定可能だが、{}で指定が必要。{href: "https://~", checked: vm.checked}など。※vm.checkedは実際にはvm.checked.valueを参照しない限りはobjectのため、内部データの変更にも対応できる。
	 * @param {Element} 最初の1つ目の生成でのみ使用。どのオブジェクトの下に配置するかを指定。
	 * @return {object} 2回目以降は再生成しない。vm.fontsizeなどの内部の値は変化するが、渡される変数自体は変化しないため。
	 */
	const el = function({
		tag = "section",
		viewmodel = ViewModel,
		contents = "",
		style = {},
		classList = [],
		events = [],
		args = {}
	}){
		 return {
			tag: tag, viewmodel: viewmodel, contents: contents, style: style, classList: classList, events: events, args: args,
			setParent: (root) => {
				const component = new Component(tag, viewmodel, contents, style, classList, events, args);
				component.parentElement = root;
				component.compose();
				root.appendChild(component.el);
			}
		};
	};

	const Component = class{
		/** @type {WeakNap} 特定の子componentが描画済みなら、そのComponentを返す。keyに{tag, contentsのhash}というobjectを渡す。 */
		#composed = new WeakMap();
		/** @type {Element} コンポーネントのroot element */
		el = null;
		/** @type {ParentElement | null} 親のDOM element*/
		parentElement = null;
		/** @type {Component[]} 子コンポーネントのinstance */
		#children = [];
		/** @type {string} htmlタグの要素aとかdivとか */
		#tag;
		/** @type {ViewModel} viewmodel。instance化せずに渡す */
		#viewmodel;

		contents;
		#style;
		#classList;
		#events;
		#args;

		constructor(tag, viewmodel, contents, style, classList, events, args){
			this.#tag = tag;
			this.#viewmodel = new viewmodel();
			this.contents = contents;
			this.#style = style;
			this.#classList = classList;
			this.#events = events;
			this.#args = args;

			this.el = document.createElement(tag);
		}

		/**
		 * このオブジェクトが他のオブジェクトと同一かを判断するために、変更されづらい要素をhash化したものを返す。
		 */
		identify(){
			const str = [this.#tag, this.contents.toString()].join("\n");
			let hash = 2166136261; // FNV-1a 初期値
			for (let i = 0; i < str.length; i++) {
				hash ^= str.charCodeAt(i);
				hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
			}
			return (hash >>> 0).toString(16); // 符号なし整数化して16進数に変換
		}

		/**
		 * 描画を行うためにcontentsの中に置かれたComponentの描画を実行する。viewmodelから通知があれば、再度呼ばれる。
		 */
		compose(){
			// 先にstyleの設定などを実行
			this.reflectStyle.apply(this.#viewmodel.accessorWithListener(this.reflectStyle));
			this.reflectClass.apply(this.#viewmodel.accessorWithListener(this.reflectClass));
			this.reflectEvent.apply(this.#viewmodel.accessorWithListener(this.reflectEvent));
			this.reflectArg.apply(this.#viewmodel.accessorWithListener(this.reflectArg));
			if(typeof this.contents == "string"){
				this.el.innerHTML = templateLiteral(this.contents, this.#viewmodel, this.compose);
			} else {
				// 初実行の場合は全部描画する。this.contentsはfunction*()のため、yieldで返ってきた値を処理
				for(const content of this.contents){
					const {tag, viewmodel, contents, style, classList, events, args} = content;
					const component = new Component(tag, viewmodel, contents, style, classList, events, args);
					component.compose();
					this.#children.push(component);
					component.parentElement = this.el;
					// elはこのコンポーネントが描画するためのElementで、その下に子コンポーネントを追加していくことで、viewが形成されていく。
					this.el.appendChild(component.el);
				}
			}
		}
		
		// styleなどの適用。また、このcomponentへの参照と、どういった要素に登録されたかをその際に使った変数に記録させる必要がある(あとで呼び出せるように)。
		/** 
		 * スタイルの反映。スタイル以外にもidやclassなども。
		 */
		reflectStyle(){
		}
		/** 
		 * classの設定
		 */
		reflectClass(){
		}
		/** 
		 * クリックイベントなどの設定
		 */
		reflectEvent(){
		}
		/**
		 * argに記載されている項目の設定。
		 */
		reflectArg(){
		}
		recompose(){
			//TODO 一度でも実行されている場合は再描画。
			for(const content of this.contents){
				const {tag, viewmodel, contents, style, classList, events, args} = content;
				//TODO 前回のcontentと異なる場合は、#childrenの同一と思われる要素と比較して見直す？
			}
		}

		/**
		 * どのDOM elementの下にこのComponent elementを置くか？
		 * @param {ParentElement} parent 
		 */
		setRoot(root){
			if(this.parentElement == null){
				this.parentElement = parent;
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
	 * @param {() => void} caller 呼び出し元の関数。
	 * @returns {string}
	 */
	const templateLiteral = function(originalText, viewmodel) {
		return originalText.replace(/(?<!\$)\$\{(.*?)\}/g, (_, key) => viewmodel[key.trim()].value || "").replace(/\$\$\{/g, "${");
	}
	
	exports.el = el;
	exports.State = State;
	exports.state = state;
	exports.ViewModel = ViewModel;
	return exports;
}({}));
