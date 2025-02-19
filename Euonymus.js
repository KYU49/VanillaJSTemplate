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
	 * メインとなるviewを生成するためのfunction
	 * @param {string} tag aやらdivやらspanやら。refの指定不可。
	 * @param {object} viewmodel { visible: new State(true), fontsize: new State(10), click: (e) => {visible = !visible} }のような形で渡す。
	 * @param {(object) => Element | string} contents Viewをjsで指定していく。stringでinnerHTMLを指定することも可能で、テンプレートリテラルのように"名前は<b>${viewmodl.name}</b>です。"のような指定も可能。
	 * @param {object} style {display: "block"}のように指定可能。ただし、"10px"などを含む文字列の場合は""で括る必要がある。右辺にはstateも利用でき、{size: "${viewmodel.fontsize}px"}といった指定も可能。
	 * @param {[string]} classList classは予約語のため、classList。"viewmodel.visible ? 'visible' : 'hidden'"のような設定をすることも可能。
	 * @param {(Event) => void | [(Event) => void]} events eventsを{type: "change", callback: click}の形で指定するか、それを含む配列を指定。
	 * @param {object} args aでのhrefや、imgでのsrcやaltなど、任意指定可能だが、{}で指定が必要。{href: "https://~", checked: true}など。
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
		return new Component(tag, viewmodel, contents, style, classList, events, args).contents;
	};

	const Component = class{
		#el;
		#parent = null;
		#children = null;
		#tag;
		#viewmodel;
		contents;
		#style;
		#classList;
		#events;
		#args;
		constructor(tag, viewmodel, contents, style, classList, events, args){
			this.#tag = tag;
			this.#el = document.createElement(tag);
			this.#viewmodel = viewmodel;
			this.contents = contents;
			this.#style = style;
			this.#classList = classList;
			this.#events = events;
			this.#args = args;
			this.compose();
		}

		/**
		 * 描画を行うためにcontentsの中に置かれたComponentの描画を実行する。viewmodelから通知があれば、再度呼ばれる。
		 */
		compose(){
			if(this.contents instanceof string){
				this.#el.innerHTML = templateLiteral(this.contents, this.#viewmodel);
			} else {
				if(this.#children == null){
					// 最初の描画の場合は実直に描画を走らせる。
					this.#el.appendChild(this.contents(this.#viewmodel));
				} else {
					//TODO 2回目以降の場合は変更点だけ再描画。どうすんの？
				}
			}
		}

		/**
		 * どのDOM elementの下にこのComponent elementを置くか？
		 * @param {ParentElement} parent 
		 */
		setRoot(root){
			if(this.#parent == null){
				this.#parent = parent;
				parent.append(this.#el);
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
