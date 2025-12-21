document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('taskList');
    const container = document.querySelector('.container');

    loadTasks();

    setTimeout(() => {
        normalizeList(taskList);
        updateToggleButtons();
    }, 0);

    container.addEventListener('click', (e) => {
        if (e.target === container) {
            if (taskList.children.length === 0) {
                createInitialRow();
            }
            taskList.focus();
            const range = document.createRange();
            range.selectNodeContents(taskList);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });

    // ----------------------------------------------------
    // ホバーアクションとプログレスバー
    // ----------------------------------------------------
    let hoverTimer = null;
    let progressElement = null;

    taskList.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            clearHoverState();

            // プログレスバー作成
            progressElement = createProgressElement(e.clientX, e.clientY);
            document.body.appendChild(progressElement);

            hoverTimer = setTimeout(() => {
                const li = e.target.closest('li');
                li.classList.toggle('collapsed');
                saveTasks();
                clearHoverState(); // 完了したら消す
            }, 1000);
        }
    });

    taskList.addEventListener('mousemove', (e) => {
        if (progressElement && hoverTimer) {
            // マウスに追従
            progressElement.style.left = e.clientX + 'px';
            progressElement.style.top = e.clientY + 'px';
        }
    });

    taskList.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            clearHoverState();
        }
    });

    function createProgressElement(x, y) {
        const div = document.createElement('div');
        div.className = 'hover-progress';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        // SVGで円グラフを描画
        div.innerHTML = `
            <svg viewBox="0 0 24 24">
                <circle class="bg" cx="12" cy="12" r="9"></circle>
                <circle class="progress" cx="12" cy="12" r="9"></circle>
            </svg>
        `;
        return div;
    }

    function clearHoverState() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
        if (progressElement) {
            progressElement.remove();
            progressElement = null;
        }
    }

    // ----------------------------------------------------
    // その他イベント処理
    // ----------------------------------------------------

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const li = e.target.closest('li');
            li.classList.toggle('collapsed');
            saveTasks();
            clearHoverState(); // クリックしたらホバーキャンセル
        }
    });

    taskList.addEventListener('input', () => {
        if (taskList.innerHTML.trim() === '' || taskList.innerHTML === '<br>') {
            createInitialRow();
        }
        normalizeList(taskList);
        updateToggleButtons();
        saveTasks();
    });

    taskList.addEventListener('keydown', (e) => {
        if (e.isComposing) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                customOutdent();
            } else {
                customIndent();
            }
            // 操作後に状態更新
            setTimeout(() => {
                normalizeList(taskList);
                updateToggleButtons();
                saveTasks();
            }, 0);
        }
    });

    // ----------------------------------------------------
    // インデント・アウトデント実装 (execCommand非使用)
    // ----------------------------------------------------
    function getSelectionLi() {
        const sel = window.getSelection();
        if (sel.rangeCount === 0) return null;
        let node = sel.getRangeAt(0).startContainer;
        if (node.nodeType === 3) node = node.parentNode;
        return node.closest('li');
    }

    function customIndent() {
        const li = getSelectionLi();
        if (!li) return;

        const prevLi = li.previousElementSibling;
        if (prevLi && prevLi.tagName === 'LI') {
            // 直前のLIの中に移動
            let childUl = prevLi.querySelector('ul, ol');
            if (!childUl) {
                childUl = document.createElement('ul');
                prevLi.appendChild(childUl);
            }
            childUl.appendChild(li);
            // フォーカス維持
            restoreFocus(li);
        }
    }

    function customOutdent() {
        const li = getSelectionLi();
        if (!li) return;

        const parentUl = li.parentNode;
        // ルートのtaskListでなければ実行
        if (parentUl && parentUl.tagName === 'UL' && parentUl.id !== 'taskList') {
            const parentLi = parentUl.closest('li');
            if (parentLi) {
                // 親LIの次の位置に移動（アウトデント）
                if (parentLi.nextSibling) {
                    parentLi.parentNode.insertBefore(li, parentLi.nextSibling);
                } else {
                    parentLi.parentNode.appendChild(li);
                }

                // 元の親ULが空になったら削除
                if (parentUl.children.length === 0) {
                    parentUl.remove();
                }

                restoreFocus(li);
            }
        }
    }

    function restoreFocus(element) {
        // 要素内の適切な位置にカーソルを戻す（簡易実装：末尾）
        // ※本来は元のカーソル位置を保持して復元すべきだが、移動で構造が変わるため難しい
        // contenteditable要素内のフォーカス
        const range = document.createRange();
        const sel = window.getSelection();

        // テキストノードがあればその末尾、なければ要素の末尾
        // シンプルに要素を選択状態にしてcollapseする
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        element.focus();
    }

    // ----------------------------------------------------
    // ヘルパー関数
    // ----------------------------------------------------

    function normalizeList(rootUl) {
        const lists = rootUl.querySelectorAll('ul, ol');
        const allLists = [rootUl, ...lists];

        allLists.forEach(list => {
            const children = Array.from(list.children);
            let lastLi = null;

            children.forEach(child => {
                if (child.tagName === 'LI') {
                    lastLi = child;
                } else if ((child.tagName === 'UL' || child.tagName === 'OL') && lastLi) {
                    lastLi.appendChild(child);
                } else if ((child.tagName === 'UL' || child.tagName === 'OL') && !lastLi) {
                    const newLi = document.createElement('li');
                    list.insertBefore(newLi, child);
                    newLi.appendChild(child);
                    lastLi = newLi;
                }
            });
        });
    }

    function updateToggleButtons() {
        const lis = taskList.querySelectorAll('li');
        lis.forEach(li => {
            let hasChildList = false;
            for (let i = 0; i < li.children.length; i++) {
                const child = li.children[i];
                if (child.tagName === 'UL' || child.tagName === 'OL') {
                    if (child.children.length > 0) {
                        hasChildList = true;
                    } else {
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

    function saveTasks() {
        localStorage.setItem('myTasksHTML', taskList.innerHTML);
    }

    function loadTasks() {
        const html = localStorage.getItem('myTasksHTML');
        if (html) {
            taskList.innerHTML = html;
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