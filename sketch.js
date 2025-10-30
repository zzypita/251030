let table;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let gameState = 'START'; // 遊戲狀態: 'START', 'QUIZ', 'RESULT'

let hoveredOption = -1; // 用於儲存滑鼠懸停在哪個選項上
let clickEffect = null; // 用於儲存點擊特效

// 游標特效
let cursorParticles = [];

// 結果動畫
let praiseParticles = []; // 稱讚的粒子（五彩紙屑）
let encourageParticles = []; // 鼓勵的粒子（泡泡）

// 按鈕
let startButton, restartButton;

// 用於響應式比例
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

function preload() {
  // 載入CSV檔案
  table = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Helvetica'); // 您可以改成 'Noto Sans TC' 或其他支援中文的字體
  parseQuestions();
  
  layoutButtons();
  
  noCursor(); // 隱藏預設游標，我們自己畫
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutButtons();
}

// 根據目前畫面大小配置按鈕與相關參數
function layoutButtons() {
  let scale = min(width / BASE_WIDTH, height / BASE_HEIGHT);
  let btnW = 200 * scale;
  let btnH = 50 * scale;
  startButton = { x: width / 2 - btnW / 2, y: height / 2 + 50 * scale, w: btnW, h: btnH };
  restartButton = { x: width / 2 - btnW / 2, y: height - 100 * scale, w: btnW, h: btnH };
}

// 將載入的Table轉換成我們需要的questions陣列，並先隨機化選項
function parseQuestions() {
  if (!table) {
    console.error("CSV檔案載入失敗！");
    return;
  }
  for (let row of table.rows) {
    let q = {
      question: row.get('question'),
      options: [
        row.get('optionA'),
        row.get('optionB'),
        row.get('optionC'),
        row.get('optionD')
      ],
      correct: parseInt(row.get('correctAnswerIndex')) // 假設CSV裡是0-based index
    };
    // 建立打亂後的顯示選項與對應的正確索引
    shuffleOptionsForQuestion(q);
    questions.push(q);
  }
}

// 把單一題目的選項打亂並紀錄新正確索引
function shuffleOptionsForQuestion(q) {
  // 建立 {text, originalIndex} 陣列
  let arr = q.options.map((t, idx) => ({ text: t, idx: idx }));
  shuffleArray(arr);
  q.shuffledOptions = arr.map(a => a.text);
  // 找到原本的正確答案在 shuffled 陣列的新索引
  q.shuffledCorrect = arr.findIndex(a => a.idx === q.correct);
}

// 若要重新開始時再次隨機化所有題目選項
function shuffleAllQuestionsOptions() {
  for (let q of questions) {
    shuffleOptionsForQuestion(q);
  }
}

// Fisher–Yates 洗牌
function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    let tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
}

// ---------------------------
// 2. 主要繪圖迴圈 (狀態機)
// ---------------------------

function draw() {
  background(255); // 白色背景

  // 根據不同的遊戲狀態繪製不同畫面
  switch (gameState) {
    case 'START':
      drawStartScreen();
      break;
    case 'QUIZ':
      drawQuizScreen();
      break;
    case 'RESULT':
      drawResultScreen();
      break;
  }
  
  // 繪製點擊特效
  drawClickEffect();
  
  // 繪製自訂游標和粒子特效
  drawCursorEffect();
}

// ---------------------------
// 3. 繪製不同畫面
// ---------------------------

function drawStartScreen() {
  textAlign(CENTER, CENTER);
  fill(0);
  let scale = min(width / BASE_WIDTH, height / BASE_HEIGHT);
  textSize(32 * scale);
  text('歡迎來到 p5.js 互動測驗系統', width / 2, height / 2 - 50 * scale);

  // 按鈕已在 layoutButtons 設定，所以直接使用
  let hovering = isMouseOver(startButton);
  drawButton(startButton, '開始測驗', hovering);
}

function drawQuizScreen() {
  if (questions.length === 0 || currentQuestionIndex >= questions.length) {
    // 如果題目載入有問題或索引出錯
    textAlign(CENTER);
    fill('red');
    textSize(24);
    text("錯誤：找不到題目！", width/2, height/2);
    return;
  }

  let q = questions[currentQuestionIndex];

  // 繪製問題
  textAlign(LEFT, TOP);
  fill(0);
  let scale = min(width / BASE_WIDTH, height / BASE_HEIGHT);
  textSize(28 * scale);
  text(`第 ${currentQuestionIndex + 1} 題：`, 50 * scale, 50 * scale);
  textWrap(WORD);
  text(q.question, 50 * scale, 100 * scale, width - 100 * scale);

  // 繪製選項 —— 支援響應式排列（寬螢幕會兩欄）
  hoveredOption = -1; // 重置懸停狀態
  let options = q.shuffledOptions;
  let n = options.length;
  let leftMargin = 100 * scale;
  let topStart = 250 * scale;
  let gapY = 70 * scale;

  if (width > 900 && n === 4) {
    // 兩欄排列
    let colW = (width - leftMargin * 2 - 20 * scale) / 2;
    for (let i = 0; i < n; i++) {
      let col = i % 2;
      let row = floor(i / 2);
      let btn = { x: leftMargin + col * (colW + 20 * scale), y: topStart + row * gapY, w: colW, h: 50 * scale };
      let optionText = `${['A','B','C','D'][i]}. ${options[i]}`;
      let hovering = isMouseOver(btn);
      if (hovering) hoveredOption = i;
      drawButton(btn, optionText, hovering, 'LEFT');
    }
  } else {
    // 單欄排列（手機或窄螢幕）
    let btnW = width - leftMargin * 2;
    for (let i = 0; i < n; i++) {
      let btn = { x: leftMargin, y: topStart + i * gapY, w: btnW, h: 50 * scale };
      let optionText = `${['A','B','C','D'][i]}. ${options[i]}`;
      let hovering = isMouseOver(btn);
      if (hovering) hoveredOption = i;
      drawButton(btn, optionText, hovering, 'LEFT');
    }
  }
}

function drawResultScreen() {
  let percentage = (score / questions.length) * 100;
  textAlign(CENTER, CENTER);
  let scale = min(width / BASE_WIDTH, height / BASE_HEIGHT);

  // 根據分數決定顯示的動畫和文字
  if (percentage >= 80) {
    // --- 稱讚動畫 ---
    fill(50, 200, 50);
    textSize(48 * scale);
    text('太棒了！恭喜你！', width / 2, height / 2 - 100 * scale);
    
    textSize(24 * scale);
    text(`你的得分：${score} / ${questions.length} (${percentage.toFixed(0)}%)`, width / 2, height / 2);
    
    // 執行稱讚動畫（五彩紙屑）
    for (let p of praiseParticles) {
      p.update();
      p.display();
    }
    // 持續產生新的
    if (frameCount % 2 === 0) {
      praiseParticles.push(new Confetti(random(width), -10));
    }
    // 移除舊的
    praiseParticles = praiseParticles.filter(p => p.isAlive());

  } else {
    // --- 鼓勵動畫 ---
    fill(255, 165, 0); // 橘色
    textSize(48 * scale);
    text('再接再厲！', width / 2, height / 2 - 100 * scale);
    
    textSize(24 * scale);
    text(`你的得分：${score} / ${questions.length} (${percentage.toFixed(0)}%)`, width / 2, height / 2);

    // 執行鼓勵動畫（泡泡）
    for (let p of encourageParticles) {
      p.update();
      p.display();
    }
    // 持續產生新的
    if (frameCount % 5 === 0) {
      encourageParticles.push(new Bubble(random(width), height + 10));
    }
    // 移除舊的
    encourageParticles = encourageParticles.filter(p => p.isAlive());
  }
  
  // 重新計算按鈕位置比例（以防視窗變動後要顯示）
  layoutButtons();
  // 繪製重新開始按鈕
  let hovering = isMouseOver(restartButton);
  drawButton(restartButton, '重新測驗', hovering);
}

// ---------------------------
// 4. 互動與邏輯
// ---------------------------

function mousePressed() {
  // 觸發點擊特效
  clickEffect = { x: mouseX, y: mouseY, r: 0, alpha: 255 };

  if (gameState === 'START') {
    if (isMouseOver(startButton)) {
      // 進入測驗前，可再次打亂每題選項（每次新遊戲不同順序）
      shuffleAllQuestionsOptions();
      gameState = 'QUIZ';
    }
  } else if (gameState === 'QUIZ') {
    if (hoveredOption !== -1) {
      checkAnswer(hoveredOption);
    }
  } else if (gameState === 'RESULT') {
    if (isMouseOver(restartButton)) {
      resetQuiz();
    }
  }
}

function mouseMoved() {
  // 新增游標粒子
  cursorParticles.push(new CursorParticle(mouseX, mouseY));
}

function checkAnswer(selectedIndex) {
  let q = questions[currentQuestionIndex];
  if (selectedIndex === q.shuffledCorrect) {
    score++;
    // (可選) 增加正確音效
  } else {
    // (可選) 增加錯誤音效
  }

  // 前往下一個問題
  currentQuestionIndex++;
  
  // 檢查是否所有題目都答完了
  if (currentQuestionIndex >= questions.length) {
    gameState = 'RESULT';
    // 在進入結果畫面時，初始化動畫粒子
    setupResultAnimation();
  }
}

function resetQuiz() {
  score = 0;
  currentQuestionIndex = 0;
  gameState = 'START';
  // 清空動畫粒子
  praiseParticles = [];
  encourageParticles = [];
  // 重新隨機化選項（讓每次重新測驗題目順序/選項順序不同）
  shuffleAllQuestionsOptions();
}

function setupResultAnimation() {
  // 預先產生一些粒子
  praiseParticles = [];
  encourageParticles = [];
  let percentage = (score / questions.length) * 100;

  if (percentage >= 80) {
    for (let i = 0; i < 100; i++) {
      praiseParticles.push(new Confetti(random(width), random(-height, 0)));
    }
  } else {
    for (let i = 0; i < 50; i++) {
      encourageParticles.push(new Bubble(random(width), random(height, height + 200)));
    }
  }
}

// ---------------------------
// 5. 特效與輔助函式
// ---------------------------

// 檢查滑鼠是否在按鈕上
function isMouseOver(btn) {
  return mouseX > btn.x && mouseX < btn.x + btn.w &&
         mouseY > btn.y && mouseY < btn.y + btn.h;
}

// 繪製按鈕的通用函式
function drawButton(btn, textStr, isHovering, align = CENTER) {
  push();
  // 懸停特效
  if (isHovering) {
    fill(220, 220, 255); // 懸停時淡紫色
    stroke(100, 100, 255);
    strokeWeight(2);
  } else {
    fill(240); // 預設灰色
    stroke(150);
    strokeWeight(1);
  }
  rect(btn.x, btn.y, btn.w, btn.h, 10); // 圓角矩形

  // 文字
  fill(0);
  noStroke();
  // 文字大小會依畫面比例自動調整
  let scale = min(width / BASE_WIDTH, height / BASE_HEIGHT);
  textSize(18 * scale);
  textAlign(align, CENTER);
  if (align === CENTER) {
    text(textStr, btn.x + btn.w / 2, btn.y + btn.h / 2);
  } else {
    text(textStr, btn.x + 20 * scale, btn.y + btn.h / 2); // 左對齊
  }
  pop();
}

// 繪製點擊特效
function drawClickEffect() {
  if (clickEffect) {
    push();
    noFill();
    stroke(0, 150, 255, clickEffect.alpha); // 藍色光圈
    strokeWeight(3);
    ellipse(clickEffect.x, clickEffect.y, clickEffect.r * 2);
    
    clickEffect.r += 5;
    clickEffect.alpha -= 15;
    
    if (clickEffect.alpha <= 0) {
      clickEffect = null;
    }
    pop();
  }
}

// 繪製游標特效
function drawCursorEffect() {
  // 更新和繪製粒子
  for (let i = cursorParticles.length - 1; i >= 0; i--) {
    cursorParticles[i].update();
    cursorParticles[i].display();
    if (cursorParticles[i].isFinished()) {
      cursorParticles.splice(i, 1);
    }
  }
  
  // 繪製自訂游標（一個簡單的圓圈）
  push();
  fill(100, 100, 255, 150); // 半透明藍色
  noStroke();
  ellipse(mouseX, mouseY, 15, 15);
  fill(255);
  ellipse(mouseX, mouseY, 5, 5);
  pop();
}

// ---------------------------
// 6. 特效類別 (Classes)
// ---------------------------

// 游標粒子
class CursorParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
    this.alpha = 255;
    this.size = random(3, 7);
    this.color = color(100, random(150, 255), 255, this.alpha);
  }

  isFinished() {
    return this.alpha <= 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 5;
    this.color.setAlpha(this.alpha);
  }

  display() {
    noStroke();
    fill(this.color);
    ellipse(this.x, this.y, this.size);
  }
}

// 稱讚動畫：五彩紙屑
class Confetti {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(1, 4);
    this.size = random(5, 10);
    this.color = color(random(255), random(255), random(255));
    this.angle = random(TWO_PI);
    this.rotationSpeed = random(-0.1, 0.1);
  }

  isAlive() {
    return this.y < height + this.size;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotationSpeed;
    // 簡單的重力
    this.vy += 0.05;
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    noStroke();
    fill(this.color);
    rectMode(CENTER);
    rect(0, 0, this.size, this.size);
    pop();
  }
}

// 鼓勵動畫：泡泡
class Bubble {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = random(10, 30);
    this.vx = random(-0.5, 0.5);
    this.vy = random(-3, -1);
    this.alpha = 150;
  }

  isAlive() {
    return this.y > -this.r;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // 輕微晃動
    this.x += sin(this.y / 20) * 0.5;
  }

  display() {
    push();
    noFill();
    stroke(0, 150, 255, this.alpha);
    strokeWeight(2);
    ellipse(this.x, this.y, this.r * 2);
    pop();
  }
}