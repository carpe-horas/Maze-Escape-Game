// 캔버스 요소 가져오기 및 2D 컨텍스트 생성
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 게임 상태 변수 초기화
let level = 1;
const tileSize = 25; // 미로의 각 칸 크기 (px)
const mazeSize = 20; // 미로의 가로, 세로 크기 (20x20)
let maze, player, goal; // 미로 배열, 플레이어 위치, 목표 지점
let timeLeft = 120;
let score = 0,
  timer;

// 키보드 이벤트와 재시작 버튼
document.addEventListener("keydown", movePlayer);
document.getElementById("restartButton").addEventListener("click", restartGame);

// 게임 시작 시 초기화
initializeGame();

// 게임 초기화 함수
function initializeGame() {
  timeLeft = Math.max(120 - (level - 1) * 10, 30); // 제한 시간 설정: 레벨이 올라갈수록 10초씩 줄어듦. 최소 30초 유지 - 방향키 속도를 볼 때 더 낮으면 게임 진행 어려움
  player = { x: 0, y: 0 };
  goal = { x: mazeSize - 1, y: mazeSize - 1 }; //목표 위치 (미로의 우하단)
  generateMaze(mazeSize, mazeSize, level); // 미로 생성
  ensureGoalAccessible();

  document.getElementById("time").textContent = `남은 시간: ${timeLeft}초`;
  document.getElementById("score").textContent = `점수: ${score}`;
  document.getElementById("level").textContent = `레벨: ${level}`;

  clearInterval(timer);
  timer = setInterval(updateTime, 1000);
  drawMaze();
}

/**
 * 미로 생성 (깊이 우선 탐색, DFS)
 * 미로의 벽을 무작위로 제거하여 길을 만듦
 * @param {*} width 
 * @param {*} height 
 */
function generateMaze(width, height) {
  maze = Array.from({ length: height }, () => Array(width).fill(1)); // 미로 배열 초기화 (모든 칸을 벽(1)으로 채움)

  const stack = []; //DFS 탐색을 위한 스택 생성

  let x = 0,
    y = 0;
  maze[y][x] = 0; // 미로 시작 위치
  stack.push({ x, y }); // 스택에 현재 위치 추가

  // DFS 탐색을 진행하며 길 뚫기
  while (stack.length) {
    const current = stack[stack.length - 1]; // 현재 위치 가져오기 (스택의 마지막 요소)

    // 이동할 방향을 무작위로 섞기 (상, 하, 좌, 우)
    const directions = shuffle([
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]);
    let moved = false;

    // 랜덤 방향으로 이동하면서 길 생성
    for (const dir of directions) { // 다음 위치 계산 (2칸 이동하여 벽을 제거하는 방식)
      const nx = current.x + dir.x * 2;
      const ny = current.y + dir.y * 2;

      // 이동 가능한지 검사 (미로 범위를 벗어나지 않고, 해당 위치가 벽(1)일 경우, 이미 길(0)인 곳이면 가지 않음)
      if (
        ny >= 0 &&
        ny < height &&
        nx >= 0 &&
        nx < width &&
        maze[ny][nx] === 1
      ) {
        // 현재 위치와 다음 위치 사이의 벽을 제거하여 길을 만듦
        maze[ny][nx] = 0;
        maze[current.y + dir.y][current.x + dir.x] = 0;
        // 새로운 위치를 스택에 추가하고 이동했다고 표시
        stack.push({ x: nx, y: ny });
        moved = true;
        break;
      }
    }

    //막다른 길이면 이전 위치로 되돌아감
    if (!moved) {
      stack.pop();
    }
  }

  ensureGoalAccessible();
}

/**
 * 배열을 무작위로 섞는 함수 *
 * Fisher-Yates 알고리즘(Modern Shuffle) 활용
 * @param {*} array 
 * @returns {*}     
 */
function shuffle(array) {//뒤에서부터 하나씩 랜덤한 위치와 바꾸는 방식으로
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; //array[i]와 array[j] 위치를 바꿈 - ES6 구조 분해 할당 사용
  }
  return array;
}

/**
 * 목표 지점 접근 가능하게 보장하는 함수
 * 목표 지점(Goal) 근처의 벽을 제거하여 반드시 도달할 수 있도록 설정
*/
function ensureGoalAccessible() {
  //목표 지점의 왼쪽과 위쪽 위치 확인
  const left = { x: goal.x - 1, y: goal.y };
  const up = { x: goal.x, y: goal.y - 1 };

  // 목표의 왼쪽과 위쪽이 모두 벽(1)로 막혀 있는 경우
  if (
    left.x >= 0 &&
    maze[left.y][left.x] === 1 &&
    up.y >= 0 &&
    maze[up.y][up.x] === 1
  ) {
    // 목표 위치의 왼쪽 또는 위쪽 중 하나를 길(0)로 변경하여 도달 가능하게 만듦
    if (left.x >= 0) maze[left.y][left.x] = 0;
    if (up.y >= 0) maze[up.y][up.x] = 0;
  }

  // 목표 지점은 항상 길(0)로 설정하여 반드시 도달할 수 있게 함
  maze[goal.y][goal.x] = 0;
}

/**
 * 플레이어 이동 함수 
 * 벽인지 확인해서 이동 가능 여부 결정
 * 목표 지점 도달 시 다음 레벨로 진행
 * @param {*} event 
 */
function movePlayer(event) {
  let newX = player.x;
  let newY = player.y;

  // 방향키 입력에 따라 이동할 위치 설정. newX, newY 값을 변경하여 이동하려는 위치를 미리 계산
  if (event.key === "ArrowUp") newY--;
  else if (event.key === "ArrowDown") newY++;
  else if (event.key === "ArrowLeft") newX--;
  else if (event.key === "ArrowRight") newX++;

  console.log(`이동 시도: 현재(${player.x}, ${player.y}) → 이동 목표(${newX}, ${newY})`);

  // 이동할 위치가 미로 범위 안이고 벽이 아니면 이동 허용
  if (
    newY >= 0 &&
    newY < maze.length &&
    newX >= 0 &&
    newX < maze[newY].length &&
    maze[newY][newX] === 0
  ) {
    player.x = newX;
    player.y = newY;
  }

  console.log(`이동 완료: 현재(${player.x}, ${player.y})`);
  drawMaze(); // 변경된 위치를 반영하여 미로 다시 그림

  //플레이어가 목표 지점에 도달하면 남은 시간 카운트 중지
  if (player.x === goal.x && player.y === goal.y) {
    clearInterval(timer);

    // 획득 점수 계산하여 누적 점수 업데이트
    let earnedScore = (level - 1) * 10 + timeLeft * 2;
    score += earnedScore;

    document.getElementById("score").textContent = `점수: ${score}`;

    alert(
      `축하합니다! 레벨 ${level}를 클리어했습니다!\n점수 획득: ${earnedScore}`
    );

    // 레벨 증가 및 새로운 미로 생성
    level++;
    initializeGame();
  }
}

// 시간 업데이트 함수
function updateTime() {
  timeLeft--; //남은 시간 1초 감소
  document.getElementById("time").textContent = `남은 시간: ${timeLeft}초`;

  // 남은 시간이 0 이하면 게임 종료
  if (timeLeft <= 0) {
    clearInterval(timer);
    alert("시간 초과! 처음부터 다시 하세요!");
    restartGame();
  }
}

// 미로와 플레이어, 목표를 그리는 함수
function drawMaze() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 전체 초기화 (이전 그림 지우기)
  const width = tileSize;
  const height = tileSize;

  // 미로 그리기
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      if (maze[y][x] === 1) {
        ctx.fillStyle = "black";
        ctx.fillRect(x * width, y * height, width, height);
      }
    }
  }

  // 출발지점 그리기
  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, width, height);

  // 목표 위치 그리기
  ctx.fillStyle = "blue";
  ctx.fillRect(goal.x * width, goal.y * height, width, height);

  // "START" 텍스트 (출발 지점)
  ctx.fillStyle = "white"; // 글자 색상
  ctx.font = "bold 8px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle"; //수직 정렬
  ctx.fillText("START", width / 2, height / 2);

  // "GOAL" 텍스트 (목표 지점)
  ctx.fillText(
    "GOAL",
    goal.x * width + width / 2,
    goal.y * height + height / 2
  );

  //  // 플레이어 위치 그리기
  //  ctx.fillStyle = "white";
  //  ctx.fillRect(player.x * width, player.y * height, width, height);

  // 플레이어를 이모지로 변경
  //🐱 🐶 🦊 🐻 🐼 🐯 🦁 🐷 🐸 🦄 🐰 🐭 🦔👽 👻 🎃 💀🐾 👣
  ctx.font = "20px Arial";
  ctx.fillText(
    "🐱",
    player.x * width + width / 2,
    player.y * height + height / 2
  );
}

// 게임 재시작
function restartGame() {
  level = 1;
  score = 0;
  timeLeft = 120; // 초기 시간으로 리셋
  clearInterval(timer);
  window.location.href = "index.html";
}
