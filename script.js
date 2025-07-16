// ゲームの状態を管理する変数
let money = 10000; // 初期資金
let population = 0;
let power = 0;
let satisfaction = 50; // 初期満足度
let currentTurn = 0; // 現在のターン数
let selectedBuildingType = null; // 選択中の建設物タイプ (例: 'residential', 'commercial')

// グリッドの設定
const GRID_SIZE = 15; // 15x15のグリッド
const CELL_SIZE = 40; // 各セルのサイズ (px) - CSSと連動
const gridContainer = document.getElementById('game-grid');
let gridCells = []; // グリッドのセル要素を格納

// リソース表示要素
const moneyDisplay = document.getElementById('money');
const populationDisplay = document.getElementById('population');
const powerDisplay = document.getElementById('power');
const satisfactionDisplay = document.getElementById('satisfaction');
const rivalMessageDisplay = document.getElementById('rival-message');
const messageArea = document.getElementById('message-area');

// ボタン要素
const buildResidentialBtn = document.getElementById('build-residential');
const buildCommercialBtn = document.getElementById('build-commercial');
const buildPowerBtn = document.getElementById('build-power');
const buildParkBtn = document.getElementById('build-park');
const deleteModeBtn = document.getElementById('delete-mode');
const nextTurnBtn = document.getElementById('next-turn');
const resetGameBtn = document.getElementById('reset-game');
const restartGameBtn = document.getElementById('restart-game'); // ゲームオーバー時のボタン

// ゲームオーバー関連要素
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalPopulationDisplay = document.getElementById('final-population');
const finalTurnDisplay = document.getElementById('final-turn');

// 建設物のデータ (費用、収入/消費、影響など)
const BUILDINGS = {
    residential: { cost: 100, income: 0, powerConsumption: 1, populationGain: 10, satisfactionEffect: 1 },
    commercial: { cost: 200, income: 50, powerConsumption: 2, populationGain: 0, satisfactionEffect: 0 },
    power: { cost: 300, income: 0, powerGeneration: 10, populationGain: 0, satisfactionEffect: -5 }, // 発電所は満足度を少し下げる
    park: { cost: 50, income: 0, powerConsumption: 0, populationGain: 0, satisfactionEffect: 10 }
};

// ゲーム初期化関数
function initializeGame() {
    money = 10000;
    population = 0;
    power = 0;
    satisfaction = 50;
    currentTurn = 0;
    selectedBuildingType = null;
    gridCells = [];
    gridContainer.innerHTML = ''; // グリッドをクリア

    // グリッドのCSS設定 (JavaScriptで動的に)
    gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    gridContainer.style.width = `${GRID_SIZE * CELL_SIZE}px`; // 幅を固定
    gridContainer.style.height = `${GRID_SIZE * CELL_SIZE}px`; // 高さを固定

    // グリッドセルの生成
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        cell.dataset.index = i; // セルのインデックス
        cell.dataset.building = ''; // 何も建っていない状態
        cell.addEventListener('click', handleCellClick);
        gridContainer.appendChild(cell);
        gridCells.push(cell);
    }
    updateUI();
    showMessage('都市建設を開始しましょう！');
    gameOverOverlay.classList.add('hidden'); // ゲームオーバー画面を隠す
}

// UIの更新
function updateUI() {
    moneyDisplay.textContent = money;
    populationDisplay.textContent = population;
    powerDisplay.textContent = power;
    satisfactionDisplay.textContent = Math.max(0, Math.min(100, satisfaction)); // 0-100%に収める
    // 資金が少ない場合の警告表示など
    if (money < 500) {
        moneyDisplay.style.color = '#f00'; // 赤色
    } else {
        moneyDisplay.style.color = '#0f0'; // 緑色
    }
}

// メッセージ表示
function showMessage(msg, type = 'info') {
    messageArea.textContent = msg;
    messageArea.style.color = type === 'error' ? '#f00' : type === 'warning' ? '#ff0' : '#fff';
}

// セルクリックハンドラ
function handleCellClick(event) {
    const cell = event.target;
    const currentBuilding = cell.dataset.building;

    if (selectedBuildingType === 'delete') {
        // 撤去モード
        if (currentBuilding) {
            deleteBuilding(cell);
        } else {
            showMessage('ここに建物はありません。', 'warning');
        }
    } else if (selectedBuildingType) {
        // 建設モード
        if (!currentBuilding) {
            buildBuilding(cell, selectedBuildingType);
        } else {
            showMessage('ここにはすでに建物があります。', 'warning');
        }
    } else {
        showMessage('建設する施設を選択してください。', 'info');
    }
}

// 施設建設
function buildBuilding(cell, type) {
    const building = BUILDINGS[type];
    if (money >= building.cost) {
        money -= building.cost;
        cell.dataset.building = type;
        cell.classList.add(type); // CSSで背景画像などを適用
        population += building.populationGain;
        power += building.powerGeneration || 0; // 発電所の場合のみ加算
        satisfaction += building.satisfactionEffect;
        showMessage(`${type} を建設しました！`);
        updateUI();
    } else {
        showMessage('資金が足りません！', 'error');
    }
}

// 施設撤去
function deleteBuilding(cell) {
    const type = cell.dataset.building;
    const building = BUILDINGS[type];
    if (building) {
        // 撤去で一部資金を回収、人口や電力なども減少
        money += Math.floor(building.cost / 2); // 半額回収
        population -= building.populationGain;
        power -= building.powerGeneration || 0;
        satisfaction -= building.satisfactionEffect;
        cell.dataset.building = '';
        cell.classList.remove(type);
        showMessage(`${type} を撤去しました。`);
        updateUI();
    }
}

// ターン進行
function nextTurn() {
    currentTurn++;
    let turnIncome = 0;
    let turnPowerConsumption = 0;
    let turnPopulationGrowth = 0; // 自然増加分
    let turnSatisfactionChange = 0;

    gridCells.forEach(cell => {
        const type = cell.dataset.building;
        if (type) {
            const building = BUILDINGS[type];
            if (building) {
                turnIncome += building.income || 0;
                turnPowerConsumption += building.powerConsumption || 0;
                turnSatisfactionChange += building.satisfactionEffect || 0;
            }
        }
    });

    // 電力供給チェック
    if (power < turnPowerConsumption) {
        showMessage('電力が不足しています！一部の施設が機能していません。', 'warning');
        // 電力不足によるペナルティ (例: 収入半減、満足度低下)
        turnIncome = Math.floor(turnIncome / 2);
        satisfaction -= 5;
    }

    // 収入と支出
    money += turnIncome;
    money -= (population * 0.5); // 人口に応じた維持費

    // 人口の自然増加
    turnPopulationGrowth = Math.floor(population * 0.05); // 現在人口の5%
    if (satisfaction < 30) turnPopulationGrowth = Math.floor(turnPopulationGrowth * 0.5); // 満足度低いと増加鈍化
    if (satisfaction > 70) turnPopulationGrowth = Math.floor(turnPopulationGrowth * 1.2); // 満足度高いと増加促進
    population += turnPopulationGrowth;

    // 満足度の変動 (人口と電力供給のバランスなども考慮)
    satisfaction += turnSatisfactionChange;
    satisfaction -= Math.floor(currentTurn / 10); // ターン経過で少しずつ満足度が下がる（都市の課題）

    // ライバル都市の影響
    applyRivalCityEffect();

    updateUI();
    checkGameOver();
    showMessage(`ターン ${currentTurn} 経過。資金: +${turnIncome}, 人口: +${turnPopulationGrowth}`);
}

// ライバル都市の影響
function applyRivalCityEffect() {
    // 例: 10ターンごとにライバル都市が成長し、わずかに収入が減少
    if (currentTurn > 0 && currentTurn % 10 === 0) {
        const impact = Math.floor(money * 0.01); // 資金の1%が減少
        money -= impact;
        rivalMessageDisplay.textContent = `ライバル都市が成長し、市場競争が激化しました。- ${impact}資金`;
        rivalMessageDisplay.style.color = '#ffaa00'; // オレンジ色
    } else {
        rivalMessageDisplay.textContent = ''; // 普段は表示しない
    }
}


// ゲームオーバー判定
function checkGameOver() {
    if (money <= 0) {
        money = 0; // 資金を0で固定
        updateUI();
        showMessage('資金が尽きました。ゲームオーバー！', 'error');
        gameOver();
    }
}

// ゲームオーバー処理
function gameOver() {
    finalPopulationDisplay.textContent = population;
    finalTurnDisplay.textContent = currentTurn;
    gameOverOverlay.classList.remove('hidden'); // ゲームオーバー画面を表示
    // 全てのボタンを無効化
    document.querySelectorAll('.pixel-button').forEach(btn => btn.disabled = true);
    gridContainer.removeEventListener('click', handleCellClick); // グリッド操作も無効化
}

// ボタンクリックイベントリスナー設定
function setupEventListeners() {
    buildResidentialBtn.addEventListener('click', () => selectBuilding('residential', buildResidentialBtn));
    buildCommercialBtn.addEventListener('click', () => selectBuilding('commercial', buildCommercialBtn));
    buildPowerBtn.addEventListener('click', () => selectBuilding('power', buildPowerBtn));
    buildParkBtn.addEventListener('click', () => selectBuilding('park', buildParkBtn));
    deleteModeBtn.addEventListener('click', () => selectBuilding('delete', deleteModeBtn));
    nextTurnBtn.addEventListener('click', nextTurn);
    resetGameBtn.addEventListener('click', initializeGame); // リセットでゲーム再開
    restartGameBtn.addEventListener('click', () => {
        gameOverOverlay.classList.add('hidden');
        document.querySelectorAll('.pixel-button').forEach(btn => btn.disabled = false); // ボタン有効化
        gridContainer.addEventListener('click', handleCellClick); // グリッド操作有効化
        initializeGame();
    });
}

// 建設物の選択状態を管理
function selectBuilding(type, button) {
    // 全てのボタンのアクティブ状態を解除
    document.querySelectorAll('.pixel-button').forEach(btn => btn.classList.remove('active'));
    
    if (selectedBuildingType === type) {
        // 同じボタンを二度押しした場合、選択解除
        selectedBuildingType = null;
        showMessage('選択を解除しました。', 'info');
    } else {
        selectedBuildingType = type;
        button.classList.add('active'); // 選択中のボタンにアクティブクラスを追加
        showMessage(`${type === 'delete' ? '撤去' : type} を選択しました。`);
    }
}

// ページロード時にゲームを開始
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});