document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('taskList');
    const container = document.querySelector('.container');

    // データ読み込み
    loadTasks();

    // ロード後に少し遅らせてボタン状態を更新（DOMのレンダリング待ち）
    setTimeout(() => {
        normalizeList(taskList);
        updateToggleButtons();
    }, 0);

    // コンテナの空きスペースをクリックしたらリストにフォーカス
    container.addEventListener('click', (e) => {
        if (e.target === container) {
            if (taskList.children.length === 0) {
                createInitialRow();
            }
            taskList.focus();

            // カーソルを末尾へ
            const range = document.createRange();
            range.selectNodeContents(taskList);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });

    // ----------------------------------------------------
    // イベント処理
    // ----------------------------------------------------

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const li = e.target.closest('li');
            li.classList.toggle('collapsed');
            saveTasks();
        }
    });

    taskList.addEventListener('input', () => {
        if (taskList.innerHTML.trim() === '' || taskList.innerHTML === '<br>') {
            createInitialRow();
        }

        // 構造がおかしくなっていたら直してからボタン更新
        normalizeList(taskList);
        updateToggleButtons();
        saveTasks();
    });

    taskList.addEventListener('keydown', (e) => {
        if (e.isComposing) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                document.execCommand('outdent');
            } else {
                document.execCommand('indent');
            }

            setTimeout(() => {
                normalizeList(taskList);
                updateToggleButtons();
                saveTasks();
            }, 0);
        }
        else if (e.key === 'Backspace') {
            // 行頭（キャレット位置0）でのBackspaceで、インデントを戻す（Outdent）
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);

                // 選択範囲が折り畳まれている（カーソル状態）か確認
                if (range.collapsed) {
                    // カーソルが要素の先頭にあるか判定
                    // startOffsetが0でも、テキストノードの途中である可能性があるため、
                    // コンテナ（li）の先頭かどうかをチェック

                    // 最も近いliを取得
                    let li = range.startContainer;
                    if (li.nodeType === 3) li = li.parentNode; // テキストノードなら親へ
                    li = li.closest('li');

                    if (li) {
                        // カーソルが本当にliの先頭（テキストの0文字目）にあるか
                        // Rangeを使って、liの先頭から現在のカーソル位置までのテキストを取得し、長さが0なら先頭とみなす
                        const preCaretRange = range.cloneRange();
                        preCaretRange.selectNodeContents(li);
                        preCaretRange.setEnd(range.endContainer, range.endOffset);

                        // テキストコンテンツを取得して、前にあるのがトグルボタンや空白文字だけなら「先頭」とみなす
                        // ただしトグルボタンは contentEditable=false なので range に含まれるか挙動がブラウザによる。
                        // テキストとして空文字列であれば先頭と判断して良い。
                        const textBefore = preCaretRange.toString();

                        // ▼ボタンのテキスト("▼")が含まれる可能性があるので除去
                        const cleanText = textBefore.replace('▼', '');

                        if (cleanText.length === 0) {
                            // インデントされているか確認（親がul/olであり、その親もliであること）
                            const parentList = li.parentNode;
                            if ((parentList.tagName === 'UL' || parentList.tagName === 'OL') &&
                                parentList.id !== 'taskList') {

                                e.preventDefault();
                                document.execCommand('outdent');

                                setTimeout(() => {
                                    normalizeList(taskList);
                                    updateToggleButtons();
                                    saveTasks();
                                }, 0);
                            }
                        }
                    }
                }
            }
        }
    });

    // ----------------------------------------------------
    // ヘルパー関数
    // ----------------------------------------------------

    // 不正なHTML構造（ulの直下にulがある状態）を修正する
    function normalizeList(rootUl) {
        // すべてのul/ol配下をチェック
        // ※ルートだけでなく再帰的あるいは全探索が必要だが、
        // 編集操作は局所的なので、まずはルートから順に探索
        const lists = rootUl.querySelectorAll('ul, ol');
        // 自分自身も含める（ルートがulなので）
        const allLists = [rootUl, ...lists];

        allLists.forEach(list => {
            // 子要素を配列化してループ（操作中にcollectionが変わるのを防ぐ）
            const children = Array.from(list.children);
            let lastLi = null;

            children.forEach(child => {
                if (child.tagName === 'LI') {
                    lastLi = child;
                    // 再帰的にこのLIの中もチェックしたほうが安全だが、
                    // querySelectorAllで取れているのでループで回ってくるはず
                } else if ((child.tagName === 'UL' || child.tagName === 'OL') && lastLi) {
                    // 直前のLIがある場合、その中に移動させる
                    lastLi.appendChild(child);
                } else if ((child.tagName === 'UL' || child.tagName === 'OL') && !lastLi) {
                    // 直前にLIがない場合（リストの先頭がいきなりULなど）、
                    // 空のLIを作って入れるか、どうするか。
                    // とりあえず空のLIに入れてあげる
                    const newLi = document.createElement('li');
                    list.insertBefore(newLi, child);
                    newLi.appendChild(child);
                    lastLi = newLi;
                }
            });
        });
    }

    function updateToggleButtons() {
        // 全てのLIを走査
        const lis = taskList.querySelectorAll('li');
        lis.forEach(li => {
            let hasChildList = false;
            // 直接の子要素を確認
            for (let i = 0; i < li.children.length; i++) {
                const child = li.children[i];
                if (child.tagName === 'UL' || child.tagName === 'OL') {
                    // 中身が空でないか確認（空のulが残ることがあるため）
                    if (child.children.length > 0) {
                        hasChildList = true;
                    } else {
                        // 空のリストなら削除してしまう（クリーニング）
                        child.remove();
                    }
                }
            }

            let btn = li.querySelector(':scope > .toggle-btn');

            if (hasChildList) {
                li.classList.add('has-children');
                if (!btn) {
                    btn = document.createElement('span');
                    btn.className = 'toggle-btn';
                    btn.contentEditable = 'false';
                    btn.textContent = '▼';
                    li.prepend(btn);
                }
            } else {
                li.classList.remove('has-children');
                if (btn) {
                    btn.remove();
                }
                li.classList.remove('collapsed');
            }
        });
    }

    // ----------------------------------------------------
    // データ保存・読み込み処理
    // ----------------------------------------------------
    function saveTasks() {
        localStorage.setItem('myTasksHTML', taskList.innerHTML);
    }

    function loadTasks() {
        const html = localStorage.getItem('myTasksHTML');
        if (html) {
            taskList.innerHTML = html;
            // ロード直後にも正規化を実行
            setTimeout(() => {
                normalizeList(taskList);
                updateToggleButtons();
            }, 0);
        } else {
            createInitialRow();
        }
    }

    function createInitialRow() {
        taskList.innerHTML = '<li></li>';
        updateToggleButtons();
    }
});