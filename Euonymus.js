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
		/**
		 * @typedef {Object} Job
		 * @property {function} func
		 * @property {Component} comp 
		 */
		/** @type {Job[]} 特定の子componentが描画済みなら、そのComponentを返す。keyに{tag, contentsのhash}というobjectを渡す。 */
		listeners = [];
		constructor(initialValue){
			this.value = initialValue;
		}
		get value(){
			return this._value;
		}
		/**
		 * @param {any} newValue
		 */
		set value(newValue){
			if (this._value != newValue){
				this._value = newValue;
				for (const job of this.listeners) {	// 一度でも呼び出されたことがあるものを全て実行
					job.func(job.comp);
				}
			}
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
		 * Proxy.xで、このviewmodelのStateにアクセスでき、この中でgetterが呼ばれると、recomposeリストに自動追加される。
		 * @param {() => void} callerFunction 呼び出し元のreflect関数 or compose関数など。
		 * @param {Component} callerComponents  
		 * @returns {Proxy} 
		 */
		accessorWithListener = function(callerFunction = null, callerComponents = null) {
			const caller = callerFunction;
			const components = callerComponents;
			const self = this;
			return new Proxy({}, {
				get: (target, prop, reveiver) => {
					if(self[prop] && self[prop] instanceof State){	// ViewModel内に標的のstateが存在するか？
						// 呼び出し元を記憶するため、currentJobをlistenerに登録し、propertyにsetが実行されたら、そのlistenerを呼び出せるようにする。
						if(caller && !self[prop].listeners.some(obj => obj.func.toString() == caller.toString() && obj.comp.toString() == components.toString())
						){	// 既に追加済なら再追加の必要はない。
							self[prop].listeners.push({func: caller, comp: components});
						}
						return self[prop].value;
					}
					console.error(`There is no State named "${prop}" in ViewModel.`);
					return undefined;
				},
				set: (target, prop, newValue, receiver) => {
					if(self[prop] && self[prop] instanceof State) {
						self[prop].value = newValue;
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
	 * @typedef { Object } EventObj
	 * @property { string } type "change"や"input"や"click"など。
	 * @property { (Event) => void } listener addEventListenerのlistenerに相当。
	 */
	/**
	 * @typedef { Object } elObj
	 * @property { string } tag aやらdivやらspanやら。viewmodelを使った指定不可。
	 * @property { ViewModel | null } viewmodel ViewModelを継承したclassをinstance化して渡す。
	 * @property { () => Generator<elObj, void, void> | string | () => string | null } contents function*(vm){}を入れて、Viewをjsで指定していく。yieldでComponentを返す。stringでinnerHTMLを指定することも可能で、viewmodel内の変数なら、`function(){return "<b>" + this.isBold + "</br>"}`のような指定も可能。
	 * @property { object } style {display: "block"}のように指定可能。viewmodel内の変数なら、右辺には`{size: function(){return this.fontsize + "px"}}`といった指定も可能。
	 * @property { string[] | object } classList classは予約語のため、classList。入れるclassのリストか、{class名: boolean}のオブジェクト。
	 * @property { EventObj[] } events eventsを{type: "change", listener: click}の形で指定する。それを含む配列で指定。
	 * @property { State } value input要素の場合のvalue。自動的にeventlistenerが作られて、bindingされる。 
	 * @property { object } args aでのhrefや、imgでのsrcやaltなど、任意指定可能だが、{}で指定が必要。{href: "https://~", checked: vm.checked}など。※vm.checkedは実際にはvm.checked.valueを参照しない限りはobjectのため、内部データの変更にも対応できる。
	 */
	/**
	 * メインとなるviewを生成するためのfunction。直接オブジェクトを渡せばいいんだけど、関数定義することで補完が効くようにしている。
	 * @param {elObj} 
	 */
	const el = function({
		tag = "section",
		viewmodel = null,
		contents = null,
		style = {},
		classList = [],
		events = [],
		value = null,
		args = {}
	}){
		 return {
			tag: tag, _viewmodel: viewmodel, contents: contents, style: style, classList: classList, events: events, value: value, args: args,
			/**
			 * 指定されたViewModelを返す。指定されていない場合は基本的には親と同じViewModelを継承, 親もViewModelが設定されていないなら、Globalな継承なしのViewModelを生成。
			 * @return { ViewModel }
			 */
			get viewmodel() {
				if(!this._viewmodel){
					return new ViewModel();
				}
				return this._viewmodel;
			},
			
			/**
			 * Componentオブジェクトの生成(= Html Elementの生成)とappendChildを同時に実行
			 * @param { Element } parentElement このElementを配置する親のHTML ElementをDOMの要素で渡す。
			 * @returns { Component }
			 */
			generateComponent: (parentElement) => {
				const component = new Component(tag, viewmodel, contents, style, classList, events, value, args);
				component.parentElement = parentElement;
				parentElement.appendChild(component.el);
				return component;
			},
			/** viewmodelがなかったら、親がある場合はcompose側で親viewmodelを設定する。parentViewmodelがnullの場合は何もしない(その場合はgetterで自動的に継承なしのViewModelが返される)
			 * @param { ViewModel } parentViewmodel ViewModelのインスタンス
			 */
			setParentViewModelIfNull: (parentViewmodel) => {
				if(!this._viewmodel){
					this._viewmodel = parentViewmodel;
				}
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
		/** @type {ViewModel} viewmodel。instance化して渡す */
		#viewmodel;
		/** @type {State} inputの場合のattribute valueの中身 */
		inputValue = null;

		contents;
		#style;
		#classList;
		events;
		args;

		constructor(tag, viewmodel, contents, style, classList, events, value, args){
			this.#tag = tag;
			this.#viewmodel = viewmodel;
			this.contents = contents;
			this.#style = style;
			this.#classList = classList;
			this.events = events;
			this.inputValue = value;
			this.args = args;

			this.el = document.createElement(tag);

			// 先にstyleの設定などを実行
			this.reflectArg();
			this.reflectStyle();
			this.reflectClass();
			this.reflectValue();	// valueにはStateが直接入り、bindingされる必要があるため、accessorWithListenerは不要。
			this.reflectEvent();
			this.compose();
		}

		/**
		 * 描画を行うためにcontentsの中に置かれたComponentの描画を実行する。viewmodelから通知があれば、再度呼ばれる。
		 * @param {Component} self 基本的にはthis。callbackで呼ばれた際に、Componentを渡さないと、thisが呼べなくなるため。
		 */
		compose(self = this){
			if(!self.contents){
				return;
			}
			// contents部分を生成。GeneratorFunction以外ならstring化してinnerHTMLに、GeneratorFunctionなら実行。
			const variableType = Object.prototype.toString.call(self.contents);
			if(variableType == "[object String]" || variableType == "[object Function]"){
				let html = self.contents;
				if(variableType == "[object Function]"){	// 動的にhtmlを生成する場合は、生成時に使用されたStateを記録。
					html = html(self.#viewmodel.accessorWithListener(self.compose, self));	// text objectなら、recomposeがかかったら、そのまま書き換えるしかないため、self.composeを渡す。
				}
				self.el.innerHTML = html;
			} else {
				// 初実行の場合は全部描画する。self.contentsはfunction*()のため、yieldで返ってきた値を処理
				for(const content of self.contents(self.#viewmodel.accessorWithListener(self.recompose, self))){
					content.setParentViewModelIfNull(self.#viewmodel);
					const component = content.generateComponent(self.el);
					self.#children.push(component);
				}
			}
		}
		/**
		 * recomposeの場合は変更点のみ再描画。GeneratorFunctionの場合以外は通常のcomposeが呼ばれる。
		 * @param {Component} self 基本的にはthis。callbackで呼ばれた際に、Componentを渡さないと、thisが呼べなくなるため。
		 */
		recompose(self = this){
			for(const content of self.contents(self.#viewmodel.accessorWithListener(self.recompose, self))){
				// 前回と同じel(= Component)が呼ばれているなら、そのComponent自体が内部でrecomposeするため、スキップすればよいが、
				// 前回と異なるComponentが呼ばれているなら、Componentの作成と、前回呼ばれて今回呼ばれなかったComponentの破棄を行う必要がある。
				content.setParentViewModelIfNull(self.#viewmodel);
				const component = content.generateComponent(self.el);
				self.#children.push(component);
			}
		}
		
		// styleなどの適用。また、このcomponentへの参照と、どういった要素に登録されたかをその際に使った変数に記録させる必要がある(あとで呼び出せるように)。
		/** 
		 * スタイルの反映。スタイル以外にもidやclassなども。
		 * @param {Component} self 基本的にはthis。callbackで呼ばれた際に、Componentを渡さないと、thisが呼べなくなるため。
		 */
		reflectStyle(self = this){
		}
		/** 
		 * classの設定, {enabled: viewmodel.isEnabled, hide: false}という形式と、["enabled"]という形式のどちらか。
		 * @param {Component} self 基本的にはthis。callbackで呼ばれた際に、Componentを渡さないと、thisが呼べなくなるため。
		 */
		reflectClass(self = this){
		}
		/** 
		 * クリックイベントなどの設定
		 */
		reflectEvent(self = this){
		}

		/** 
		 * inputの場合のvalue attribute。リスナーの設定も行う。Stateが入っているため、accessorWithListenerは呼ばない。
		 * @param {Component} self 基本的にはthis。callbackで呼ばれた際に、Componentを渡さないと、thisが呼べなくなるため。
		 */
		reflectValue(self = this){
			if(self.inputValue){
				self.el.value = self.inputValue.value;
				if(!self.args){
					return;
				}
				if(!self.args.type){
					self.args.type = "text";
				}
				// checkedとhiddenが書き換わるなどあり得るため、念の為関数実行もしておく。
				switch(
					typeof self.args.type == "string" ? self.args.type : self.args(self.#viewmodel.accessorWithListener(self.reflectValue, self))
				){
					case undefined:
					case "button":
					case "hidden":
					case "image":
					case "submit":
						break;
					case "checkbox":
						{
							const callback = function(e){
								self.inputValue.value = self.el.checked;
							};
							self.addEventListener("change", callback);
						}
						break;
					default:
						{
							const callback = function(e){
								self.inputValue.value = self.el.value;
							};
							self.addEventListener("input", callback);
						}
						break;
				}
			}
		}
		/**
		 * argに記載されている項目の設定。
		 * @param {Component} self 基本的にはthis。callbackで呼ばれた際に、Componentを渡さないと、thisが呼べなくなるため。
		 */
		reflectArg(self = this){
			for(const prop in this.args){
				this.el.setAttribute(prop, this.args[prop]);
			}
		}

		/**
		 * reflectEventsと別で、単発でEventを追加したい場合。例えば、inputの値が変更された際のcallback登録など。
		 * @param {string} type "change"や"input"など。
		 * @param {(e) => void} callback
		 */
		addEventListener(type, callback){
			// Eventlistenerが設定されていなかったら追加
			if(!this.events.some(obj => obj.type == type && obj.callback.toString() == callback.toString())){
				this.events.push({type: type, callback: callback});
				this.el.addEventListener(type, (e) => {callback(e)});
			}
		}
	}
	// 同じelをリスト的に描画するために使用。
	const Column = function(){

	};

	/**
	 * このオブジェクトが他のオブジェクトと同一かを判断するために、変更されづらい要素をhash化したものを返す。
	 * @param { elObj } obj
	 */
	const identify = function(obj){
		const str = obj.join("\n");
		let hash = 2166136261; // FNV-1a 初期値
		for (let i = 0; i < str.length; i++) {
			hash ^= str.charCodeAt(i);
			hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
		}
		return (hash >>> 0).toString(16); // 符号なし整数化して16進数に変換
	}
	
	exports.el = el;
	exports.State = State;
	exports.state = state;
	exports.ViewModel = ViewModel;
	return exports;
}({}));
