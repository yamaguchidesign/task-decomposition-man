document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const calendarSidebar = document.getElementById('calendar-sidebar');

    // 12色のカラーパレット
    const PROJECT_COLORS = [
        '#3498db', // Blue (Default)
        '#e74c3c', // Red
        '#2ecc71', // Green
        '#f39c12', // Orange
        '#9b59b6', // Purple
        '#1abc9c', // Teal
        '#e91e63', // Pink
        '#3f51b5', // Indigo
        '#795548', // Brown
        '#34495e', // Dark Gray
        '#2c3e50', // Navy
        '#7cb342'  // Olive
    ];

    // カレンダー表示切り替えボタンの生成
    const toggleCalendarBtn = document.createElement('div');
    toggleCalendarBtn.className = 'calendar-toggle-btn';
    toggleCalendarBtn.textContent = '>'; // 初期状態: 開いているので閉じるボタン
    toggleCalendarBtn.title = 'カレンダーの表示/非表示';
    document.body.appendChild(toggleCalendarBtn);

    // カレンダー表示状態の初期化
    const isCalendarVisible = localStorage.getItem('isCalendarVisible') !== 'false'; // デフォルトtrue
    if (!isCalendarVisible) {
        calendarSidebar.classList.add('hidden');
        toggleCalendarBtn.classList.add('closed');
        toggleCalendarBtn.textContent = '<'; // 閉じているので開くボタン
    }

    // 表示切り替えイベント
    toggleCalendarBtn.addEventListener('click', () => {
        calendarSidebar.classList.toggle('hidden');
        toggleCalendarBtn.classList.toggle('closed');

        const isVisible = !calendarSidebar.classList.contains('hidden');
        toggleCalendarBtn.textContent = isVisible ? '>' : '<';

        localStorage.setItem('isCalendarVisible', isVisible);
    });

    const historyStack = [];
    const redoStack = [];
    const MAX_HISTORY = 50;

    let projects = [];

    // 日本の祝日データ
    const holidays = {
        '2024-01-01': '元日', '2024-01-08': '成人の日', '2024-02-11': '建国記念の日', '2024-02-12': '振替休日', '2024-02-23': '天皇誕生日', '2024-03-20': '春分の日', '2024-04-29': '昭和の日', '2024-05-03': '憲法記念日', '2024-05-04': 'みどりの日', '2024-05-05': 'こどもの日', '2024-05-06': '振替休日', '2024-07-15': '海の日', '2024-08-11': '山の日', '2024-08-12': '振替休日', '2024-09-16': '敬老の日', '2024-09-22': '秋分の日', '2024-09-23': '振替休日', '2024-10-14': 'スポーツの日', '2024-11-03': '文化の日', '2024-11-04': '振替休日', '2024-11-23': '勤労感謝の日',
        '2025-01-01': '元日', '2025-01-13': '成人の日', '2025-02-11': '建国記念の日', '2025-02-23': '天皇誕生日', '2025-02-24': '振替休日', '2025-03-20': '春分の日', '2025-04-29': '昭和の日', '2025-05-03': '憲法記念日', '2025-05-04': 'みどりの日', '2025-05-05': 'こどもの日', '2025-05-06': '振替休日', '2025-07-21': '海の日', '2025-08-11': '山の日', '2025-09-15': '敬老の日', '2025-09-23': '秋分の日', '2025-10-13': 'スポーツの日', '2025-11-03': '文化の日', '2025-11-23': '勤労感謝の日', '2025-11-24': '振替休日',
        '2026-01-01': '元日', '2026-01-12': '成人の日', '2026-02-11': '建国記念の日', '2026-02-23': '天皇誕生日', '2026-03-20': '春分の日', '2026-04-29': '昭和の日', '2026-05-03': '憲法記念日', '2026-05-04': 'みどりの日', '2026-05-05': 'こどもの日', '2026-05-06': '振替休日', '2026-07-20': '海の日', '2026-08-11': '山の日', '2026-09-21': '敬老の日', '2026-09-22': '国民の休日', '2026-09-23': '秋分の日', '2026-10-12': 'スポーツの日', '2026-11-03': '文化の日', '2026-11-23': '勤労感謝の日',
        '2027-01-01': '元日', '2027-01-11': '成人の日', '2027-02-11': '建国記念の日', '2027-02-23': '天皇誕生日', '2027-03-21': '春分の日', '2027-03-22': '振替休日', '2027-04-29': '昭和の日', '2027-05-03': '憲法記念日', '2027-05-04': 'みどりの日', '2027-05-05': 'こどもの日', '2027-07-19': '海の日', '2027-08-11': '山の日', '2027-09-20': '敬老の日', '2027-09-23': '秋分の日', '2027-10-11': 'スポーツの日', '2027-11-03': '文化の日', '2027-11-23': '勤労感謝の日'
    };

    loadProjects();
    renderCalendar();

    // ロード後にタスクイベントを表示
    setTimeout(renderCalendarEvents, 500);

    // ----------------------------------------------------
    // カレンダー機能
    // ----------------------------------------------------
    let taskTooltip = null;

    calendarSidebar.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('calendar-task')) {
            const text = e.target.dataset.fullText;
            if (text) {
                if (taskTooltip) taskTooltip.remove();
                taskTooltip = document.createElement('div');
                taskTooltip.className = 'task-tooltip';
                taskTooltip.textContent = text;
                document.body.appendChild(taskTooltip);
                updateTooltipPos(e);
            }
        }
    });

    calendarSidebar.addEventListener('mousemove', (e) => {
        if (taskTooltip) {
            updateTooltipPos(e);
        }
    });

    calendarSidebar.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('calendar-task')) {
            if (taskTooltip) {
                taskTooltip.remove();
                taskTooltip = null;
            }
        }
    });

    function updateTooltipPos(e) {
        if (!taskTooltip) return;
        // マウスの少し右下に表示
        taskTooltip.style.left = (e.clientX + 10) + 'px';
        taskTooltip.style.top = (e.clientY + 10) + 'px';
    }

    function renderCalendar() {
        calendarSidebar.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'calendar-grid-seamless';

        const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
        const headerRow = document.createElement('div');
        headerRow.className = 'calendar-header-row';
        weekdays.forEach(day => {
            const header = document.createElement('div');
            header.className = 'weekday-header';
            header.textContent = day;
            headerRow.appendChild(header);
        });
        calendarSidebar.appendChild(headerRow);
        calendarSidebar.appendChild(grid);

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const todayZero = new Date(currentYear, currentMonth, today.getDate());

        let renderDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 12, 0);

        let firstDayIndex = renderDate.getDay();
        let startOffset = (firstDayIndex + 6) % 7;

        for (let i = 0; i < startOffset; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            grid.appendChild(emptyCell);
        }

        while (renderDate <= endDate) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';

            const y = renderDate.getFullYear();
            const m = renderDate.getMonth();
            const d = renderDate.getDate();
            const dayOfWeek = renderDate.getDay();

            // 日付ID付与（タスク追加用）: cell-YYYY-MM-DD
            const dateId = `cell-${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cell.id = dateId;

            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            const dateNum = document.createElement('span');
            dateNum.className = 'date-number';
            dateNum.textContent = d;

            if (d === 1) {
                const monthLabel = document.createElement('span');
                monthLabel.className = 'month-label';
                monthLabel.textContent = `${m + 1}月`;
                cell.appendChild(monthLabel);
                cell.classList.add('first-day');
            }

            cell.appendChild(dateNum);

            if (holidays[dateStr]) {
                cell.classList.add('holiday');
                const holidayName = document.createElement('span');
                holidayName.className = 'holiday-name';
                holidayName.textContent = holidays[dateStr];
                cell.appendChild(holidayName);
            }

            if (dayOfWeek === 0) cell.classList.add('sunday');
            if (dayOfWeek === 6) cell.classList.add('saturday');

            if (renderDate < todayZero) {
                cell.classList.add('past-day');
            }

            if (renderDate.getTime() === todayZero.getTime()) {
                cell.classList.add('today');
            }

            grid.appendChild(cell);
            renderDate.setDate(renderDate.getDate() + 1);
        }
    }

    // タスクから締切日を抽出してカレンダーに表示
    function renderCalendarEvents() {
        // 全ての既存イベントをクリア
        const oldEvents = document.querySelectorAll('.calendar-task');
        oldEvents.forEach(el => el.remove());

        // 現在のDOMから抽出
        const cards = document.querySelectorAll('.project-card');
        const currentYear = new Date().getFullYear();
        const regex = /\s-(\d{1,2})\/(\d{1,2})$/; // " -12/24" 形式

        cards.forEach(card => {
            const projectColor = card.dataset.color || PROJECT_COLORS[0];
            const lis = card.querySelectorAll('.taskList li');

            lis.forEach(li => {
                // li直下のテキストノードのみを取得する
                // これにより、子要素（ul/ol/divなど）のテキストを含めないようにする
                let text = '';
                li.childNodes.forEach(node => {
                    if (node.nodeType === 3) { // Text node
                        text += node.textContent;
                    }
                });

                text = text.trim();
                // ▼ボタンなどの装飾文字を除去（ボタンは要素なのでテキストノードには含まれないはずだが念のため）
                text = text.replace(/^▼/, '').trim();

                const match = text.match(regex);
                if (match) {
                    const month = parseInt(match[1]);
                    const day = parseInt(match[2]);

                    const dateIdThisYear = `cell-${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dateIdNextYear = `cell-${currentYear + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    let targetCell = document.getElementById(dateIdThisYear);
                    if (!targetCell) {
                        targetCell = document.getElementById(dateIdNextYear);
                    }

                    if (targetCell) {
                        const taskDiv = document.createElement('div');
                        taskDiv.className = 'calendar-task';
                        const title = text.replace(regex, '');
                        taskDiv.textContent = title;
                        taskDiv.dataset.fullText = title;
                        // プロジェクトの色を適用
                        taskDiv.style.backgroundColor = projectColor;
                        targetCell.appendChild(taskDiv);
                    }
                }
            });
        });
    }

    // ----------------------------------------------------
    // プロジェクト管理
    // ----------------------------------------------------

    function loadProjects() {
        const data = localStorage.getItem('myProjects');
        if (data) {
            try {
                projects = JSON.parse(data);
            } catch (e) {
                console.error('Failed to parse projects', e);
                projects = [];
            }
        }

        if (!projects || projects.length === 0) {
            const oldHtml = localStorage.getItem('myTasksHTML');
            if (oldHtml) {
                projects = [{
                    id: Date.now(),
                    title: 'タスクリスト',
                    html: oldHtml,
                    color: PROJECT_COLORS[0]
                }];
            } else {
                projects = [{
                    id: Date.now(),
                    title: 'タスクリスト',
                    html: '<li></li>',
                    color: PROJECT_COLORS[0]
                }];
            }
        }

        // 古いデータ形式（colorがない）への対応
        projects.forEach(p => {
            if (!p.color) p.color = PROJECT_COLORS[0];
        });

        renderProjects();
    }

    function renderProjects() {
        board.innerHTML = '';
        projects.forEach(proj => {
            const card = createProjectCard(proj);
            board.appendChild(card);

            const list = card.querySelector('.taskList');
            setTimeout(() => {
                normalizeList(list);
                updateToggleButtons(list);
            }, 0);
        });
        // カレンダーイベント更新
        renderCalendarEvents();
    }

    function createProjectCard(proj) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.id = proj.id;
        const color = proj.color || PROJECT_COLORS[0];
        card.dataset.color = color;
        // CSS変数を設定（スタイル制御用）
        card.style.setProperty('--project-color', color);

        card.innerHTML = `
            <div class="color-picker-btn"></div>
            <div class="project-title" contenteditable="true">${proj.title}</div>
            <ul class="taskList" contenteditable="true">${proj.html}</ul>
            <div class="add-project-btn">+</div>
        `;

        // カラーピッカーイベント
        const colorBtn = card.querySelector('.color-picker-btn');
        colorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showColorPalette(card, colorBtn);
        });

        return card;
    }

    function showColorPalette(card, triggerBtn) {
        // 既存のパレットがあれば消す
        const existing = document.querySelector('.color-palette-popup');
        if (existing) existing.remove();

        const palette = document.createElement('div');
        palette.className = 'color-palette-popup';

        PROJECT_COLORS.forEach(color => {
            const opt = document.createElement('div');
            opt.className = 'color-option';
            opt.style.backgroundColor = color;
            if (color === card.dataset.color) opt.classList.add('selected');

            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                saveHistory();

                // 色適用
                card.dataset.color = color;
                card.style.setProperty('--project-color', color);

                saveProjects(); // ここでカレンダーも更新される
                palette.remove();
            });
            palette.appendChild(opt);
        });

        card.appendChild(palette);

        // クリックイベントで閉じる処理（1回限り）
        const closeHandler = (e) => {
            if (!palette.contains(e.target) && e.target !== triggerBtn) {
                palette.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    function addNewProject() {
        const newProj = {
            id: Date.now(),
            title: '新規プロジェクト',
            html: '<li></li>',
            color: PROJECT_COLORS[0]
        };
        // DOMに追加してから保存しないと、saveProjects()がDOMから読み取る際に反映されない
        const card = createProjectCard(newProj);
        board.appendChild(card);

        // プロジェクトリストを更新して保存
        saveProjects();

        card.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }

    function saveProjects(shouldSaveHistory = false) {
        const cards = document.querySelectorAll('.project-card');
        projects = Array.from(cards).map(card => {
            return {
                id: parseInt(card.dataset.id),
                title: card.querySelector('.project-title').textContent,
                html: card.querySelector('.taskList').innerHTML,
                color: card.dataset.color || PROJECT_COLORS[0]
            };
        });

        if (shouldSaveHistory) saveHistory();
        localStorage.setItem('myProjects', JSON.stringify(projects));

        // カレンダー更新
        renderCalendarEvents();
    }

    // ... (History Management, Event Delegation はそのまま) ...
    function saveHistory() {
        const state = JSON.stringify(projects);
        if (historyStack.length > 0 && historyStack[historyStack.length - 1] === state) {
            return;
        }
        historyStack.push(state);
        if (historyStack.length > MAX_HISTORY) {
            historyStack.shift();
        }
        redoStack.length = 0;
    }

    function undo() {
        if (historyStack.length === 0) return;

        const currentState = JSON.stringify(projects);
        if (redoStack.length === 0 || redoStack[redoStack.length - 1] !== currentState) {
            redoStack.push(currentState);
        }

        const prevStateStr = historyStack.pop();
        if (prevStateStr) {
            if (prevStateStr === currentState && historyStack.length > 0) {
                redoStack.push(prevStateStr);
                const prevState2 = historyStack.pop();
                projects = JSON.parse(prevState2);
            } else {
                projects = JSON.parse(prevStateStr);
            }
            renderProjects();
            saveProjects(false);
        }
    }

    function redo() {
        if (redoStack.length === 0) return;
        const nextStateStr = redoStack.pop();
        historyStack.push(JSON.stringify(projects));
        projects = JSON.parse(nextStateStr);
        renderProjects();
        saveProjects(false);
    }

    board.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-project-btn')) {
            saveHistory();
            addNewProject();
            return;
        }

        if (e.target.classList.contains('project-card')) {
            // カード背景クリック時などはフォーカスしないようにする、あるいはリストへ
            // ここではリスト以外の場所クリックでリストにフォーカスがいくのを防ぐ制御が必要かも
            // 現状維持
        }

        if (e.target.closest('.taskList')) {
            // リスト内クリック時の処理（特にないがフォーカス維持など）
        }

        if (e.target.classList.contains('toggle-btn')) {
            e.preventDefault();
            e.stopPropagation();
            saveHistory();
            const li = e.target.closest('li');
            li.classList.toggle('collapsed');

            // プレビュー更新のためにupdateToggleButtonsを呼ぶ
            // ただし全体を走査すると重いので、このliが含まれるリストだけ更新
            const list = li.closest('.taskList');
            updateToggleButtons(list);

            saveProjects();
            clearHoverState();
        }
    });

    let inputDebounceTimer = null;
    board.addEventListener('input', (e) => {
        const target = e.target;

        if (target.classList.contains('project-title')) {
            if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
            inputDebounceTimer = setTimeout(() => {
                saveHistory();
                saveProjects();
            }, 1000);
            return;
        }

        if (target.closest('.taskList')) {
            const list = target.closest('.taskList');
            if (list.innerHTML.trim() === '' || list.innerHTML === '<br>') {
                list.innerHTML = '<li></li>';
                updateToggleButtons(list);
            }

            if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
            inputDebounceTimer = setTimeout(() => {
                saveHistory();
            }, 1000);

            normalizeList(list);
            updateToggleButtons(list);
            saveProjects(false); // カレンダー更新含む
        }
    });

    board.addEventListener('keydown', (e) => {
        if (e.isComposing) return;

        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
            return;
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
            e.preventDefault();
            redo();
            return;
        }

        const list = e.target.closest('.taskList');
        if (!list) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            saveHistory();
            if (e.shiftKey) {
                customOutdent(list);
            } else {
                customIndent(list);
            }
            setTimeout(() => {
                normalizeList(list);
                updateToggleButtons(list);
                saveProjects();
            }, 0);
        }
        else if (e.key === 'Backspace') {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && sel.getRangeAt(0).collapsed) {
                let li = sel.getRangeAt(0).startContainer;
                if (li.nodeType === 3) li = li.parentNode;
                li = li.closest('li');
                if (li && list.contains(li)) {
                    const text = li.textContent.replace('▼', '').trim();
                    if (text === '') {
                        const parentUl = li.parentNode;
                        // 通常のアウトデント処理
                        if (parentUl && parentUl !== list) {
                            e.preventDefault();
                            saveHistory();
                            customOutdent(list);
                            setTimeout(() => {
                                normalizeList(list);
                                updateToggleButtons(list);
                                saveProjects();
                            }, 0);
                        }
                        // タスクが1つしかなく、それが空の場合（プロジェクト削除）
                        else if (list.querySelectorAll('li').length === 1) {
                            e.preventDefault();
                            if (confirm('プロジェクトを削除しますか？')) {
                                saveHistory();
                                const card = list.closest('.project-card');
                                card.remove();
                                saveProjects();
                            }
                        }
                    }
                }
            }
        }
        else if (e.key === 'Enter') {
            saveHistory();
        }
    });

    let hoverTimer = null;
    let progressElement = null;

    board.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            clearHoverState();
            progressElement = createProgressElement(e.clientX, e.clientY);
            document.body.appendChild(progressElement);

            hoverTimer = setTimeout(() => {
                saveHistory();
                const li = e.target.closest('li');
                li.classList.toggle('collapsed');

                // プレビュー更新
                const list = li.closest('.taskList');
                updateToggleButtons(list);

                saveProjects();
                clearHoverState();
            }, 500);
        }
    });

    board.addEventListener('mousemove', (e) => {
        if (progressElement && hoverTimer) {
            progressElement.style.left = e.clientX + 'px';
            progressElement.style.top = e.clientY + 'px';
        }
    });

    board.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            clearHoverState();
        }
    });

    function createProgressElement(x, y) {
        const div = document.createElement('div');
        div.className = 'hover-progress';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
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

    // ... (helper functions: getSelectedListItems, customIndent, customOutdent, saveSelectionState, restoreSelectionState, restoreFocus, normalizeList, updateToggleButtons) ...
    // これらは変更なし

    function getSelectedListItems(rootList) {
        const sel = window.getSelection();
        if (sel.rangeCount === 0) return [];
        const range = sel.getRangeAt(0);
        if (!rootList.contains(range.commonAncestorContainer)) return [];
        const allLis = Array.from(rootList.querySelectorAll('li'));
        const selectedLis = [];
        let inRange = false;
        let startNode = range.startContainer;
        let endNode = range.endContainer;
        let startLi = startNode.nodeType === 3 ? startNode.parentNode.closest('li') : startNode.closest('li');
        let endLi = endNode.nodeType === 3 ? endNode.parentNode.closest('li') : endNode.closest('li');
        if (!startLi && !endLi) return [];
        for (const li of allLis) {
            if (li === startLi) inRange = true;
            if (inRange) selectedLis.push(li);
            if (li === endLi) { inRange = false; break; }
        }
        const rootLis = [];
        selectedLis.forEach(li => {
            let parent = li.parentNode.closest('li');
            let isChildOfSelected = false;
            while (parent) {
                if (selectedLis.includes(parent)) { isChildOfSelected = true; break; }
                parent = parent.parentNode.closest('li');
            }
            if (!isChildOfSelected) rootLis.push(li);
        });
        return rootLis;
    }

    function customIndent(rootList) {
        const targetLis = getSelectedListItems(rootList);
        if (targetLis.length === 0) return;
        const selectionSnapshot = saveSelectionState(targetLis);
        targetLis.forEach(li => {
            const prevLi = li.previousElementSibling;
            if (prevLi && prevLi.tagName === 'LI') {
                let childUl = prevLi.querySelector('ul, ol');
                if (!childUl) {
                    childUl = document.createElement('ul');
                    prevLi.appendChild(childUl);
                    childUl.appendChild(li);
                } else {
                    if (childUl.firstChild) {
                        childUl.insertBefore(li, childUl.firstChild);
                    } else {
                        childUl.appendChild(li);
                    }
                }
            }
        });
        restoreSelectionState(selectionSnapshot);
    }

    function customOutdent(rootList) {
        const targetLis = getSelectedListItems(rootList);
        if (targetLis.length === 0) return;
        const selectionSnapshot = saveSelectionState(targetLis);
        [...targetLis].reverse().forEach(li => {
            const parentUl = li.parentNode;
            if (parentUl && parentUl !== rootList && (parentUl.tagName === 'UL' || parentUl.tagName === 'OL')) {
                const parentLi = parentUl.closest('li');
                if (parentLi) {
                    if (parentLi.nextSibling) {
                        parentLi.parentNode.insertBefore(li, parentLi.nextSibling);
                    } else {
                        parentLi.parentNode.appendChild(li);
                    }
                    if (parentUl.children.length === 0) {
                        parentUl.remove();
                    }
                }
            }
        });
        restoreSelectionState(selectionSnapshot);
    }

    function saveSelectionState(lis) {
        const ids = [];
        lis.forEach((li, index) => {
            const id = 'sel-' + Date.now() + '-' + index;
            li.dataset.tempId = id;
            ids.push(id);
        });
        return ids;
    }

    function restoreSelectionState(ids) {
        const lis = [];
        ids.forEach(id => {
            const li = document.querySelector(`li[data-temp-id="${id}"]`);
            if (li) {
                lis.push(li);
                delete li.dataset.tempId;
            }
        });
        if (lis.length > 0) {
            const range = document.createRange();
            const sel = window.getSelection();
            const startLi = lis[0];
            const endLi = lis[lis.length - 1];
            range.setStart(startLi, 0);
            range.setEnd(endLi, endLi.childNodes.length);
            sel.removeAllRanges();
            sel.addRange(range);
            endLi.focus();
        }
    }

    function restoreFocus(element) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        element.focus();
    }

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

    function updateToggleButtons(rootUl) {
        const lis = rootUl.querySelectorAll('li');
        lis.forEach(li => {
            let hasChildList = false;
            let childUl = null;
            for (let i = 0; i < li.children.length; i++) {
                const child = li.children[i];
                if (child.tagName === 'UL' || child.tagName === 'OL') {
                    if (child.children.length > 0) {
                        hasChildList = true;
                        childUl = child;
                    } else {
                        child.remove();
                    }
                }
            }
            let btn = li.querySelector(':scope > .toggle-btn');

            // プレビュー用要素の処理
            let preview = li.querySelector(':scope > .child-preview');
            if (preview) preview.remove(); // 一旦削除して再生成（状態更新のため）

            if (hasChildList) {
                li.classList.add('has-children');
                if (!btn) {
                    btn = document.createElement('span');
                    btn.className = 'toggle-btn';
                    btn.contentEditable = 'false';
                    btn.textContent = '▼';
                    li.prepend(btn);
                }

                // 畳まれている場合、子タスクのプレビューを表示
                if (li.classList.contains('collapsed') && childUl) {
                    const childTexts = [];
                    const childLis = childUl.querySelectorAll(':scope > li');
                    childLis.forEach(childLi => {
                        let text = childLi.textContent.trim();
                        // プレビューやボタンのテキストを除去
                        text = text.replace('▼', '').replace(/[\r\n]+/g, ' ').trim();
                        // 自分の子プレビューも除去（再帰的な表示を防ぐため簡易的に）
                        const childPreview = childLi.querySelector('.child-preview');
                        if (childPreview) {
                            text = text.replace(childPreview.textContent, '').trim();
                        }
                        if (text) childTexts.push(text);
                    });

                    if (childTexts.length > 0) {
                        preview = document.createElement('span');
                        preview.className = 'child-preview';
                        preview.contentEditable = 'false';
                        preview.textContent = childTexts.join(', ');
                        // テキストノードの直後に追加したいが、liの構造上、最後に追加するのが安全
                        // ただしulの前に追加する必要がある
                        li.insertBefore(preview, childUl);
                    }
                }

            } else {
                li.classList.remove('has-children');
                if (btn) { btn.remove(); }
                li.classList.remove('collapsed');
            }
        });
    }
});