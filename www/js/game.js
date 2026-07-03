const COLS = 8;
const MAX_ROWS = 14;
const MIN_MATCH = 3;
const SHOTS_BEFORE_DROP = 4;
const INITIAL_ROWS = 6;
const INITIAL_MAX_CLUSTER = 4;
const AIM_GAP_DIAMETERS = 4;

const COLORS = [
  { fill: '#7AE850', light: '#C8FF98', dark: '#3A9820' },
  { fill: '#FFD040', light: '#FFF0A0', dark: '#C89800' },
  { fill: '#FF8830', light: '#FFBB70', dark: '#C85010' },
  { fill: '#C858E8', light: '#E898FF', dark: '#8828A8' },
  { fill: '#48C8F8', light: '#98E8FF', dark: '#2088C8' }
];

class BubbleShooterGame {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;
    this.grid = [];
    this.score = 0;
    this.bubbleR = 16;
    this.framePad = 0;
    this.boardTop = 0;
    this.rowStep = 0;
    this.cannonX = 0;
    this.cannonY = 0;
    this.cannonBaseY = 0;
    this.aimAngle = -Math.PI / 2;
    this.currentColor = 0;
    this.nextColor = 0;
    this.flying = null;
    this.shotsSinceDrop = 0;
    this.busy = false;
    this.locked = false;
    this.aiming = false;
    this.gameOver = false;
    this.logicalW = 0;
    this.logicalH = 0;
    this.dangerY = 0;
    this.aimZoneTop = 0;
    this.aimZoneBottom = 0;
    this.maxPlayRow = 0;
    this.animPop = null;
    this.animDrop = null;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(canvas.parentElement);
    }

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointercancel', () => { this.aiming = false; });

    this.resize();
    this.resetGame(false);
  }

  canPlay() {
    return !this.locked && !this.gameOver && !this.busy && !this.flying;
  }

  colsInRow(r) {
    return r % 2 === 0 ? COLS : COLS - 1;
  }

  rowOffsetX(r) {
    return r % 2 === 1 ? this.bubbleR : 0;
  }

  gridPixelWidth() {
    return COLS * this.bubbleR * 2;
  }

  playfieldLeft() {
    return this.framePad + this.bubbleR;
  }

  playfieldRight() {
    return this.logicalW - this.framePad - this.bubbleR;
  }

  cellCenter(r, c) {
    const d = this.bubbleR * 2;
    return {
      x: this.boardLeft + this.rowOffsetX(r) + c * d + this.bubbleR,
      y: this.boardTop + r * this.rowStep + this.bubbleR
    };
  }

  bubbleBottom(y) {
    return y + this.bubbleR;
  }

  launcherBubbleCenterY() {
    return this.cannonY + Math.sin(this.aimAngle) * this.bubbleR * 0.15;
  }

  failLineY() {
    return this.launcherBubbleCenterY() - this.bubbleR;
  }

  isOverLine(y) {
    return this.bubbleBottom(y) >= this.failLineY();
  }

  updateLayoutCache() {
    const failY = this.failLineY();
    let maxRow = 0;
    for (let r = MAX_ROWS - 1; r >= 0; r--) {
      if (this.bubbleBottom(this.cellCenter(r, 0).y) < failY) {
        maxRow = r;
        break;
      }
    }
    this.maxPlayRow = maxRow;
    this.dangerY = failY;
  }

  buildAnchoredSet() {
    const anchored = new Set();
    const stack = [];
    for (let c = 0; c < this.colsInRow(0); c++) {
      if (this.grid[0][c] != null) stack.push([0, c]);
    }
    while (stack.length) {
      const [r, c] = stack.pop();
      const k = `${r},${c}`;
      if (anchored.has(k) || this.grid[r][c] == null) continue;
      anchored.add(k);
      this.getNeighbors(r, c).forEach(([nr, nc]) => stack.push([nr, nc]));
    }
    return anchored;
  }

  isAttachableSlot(r, c, anchored) {
    if (r < 0 || r > this.maxPlayRow || c < 0 || c >= this.colsInRow(r)) return false;
    if (this.grid[r][c] != null) return false;
    if (this.isOverLine(this.cellCenter(r, c).y)) return false;
    if (r === 0) return true;
    return this.getNeighbors(r, c).some(([nr, nc]) => anchored.has(`${nr},${nc}`));
  }

  resize() {
    const area = this.canvas.parentElement;
    if (!area) return;
    const w = Math.floor(area.clientWidth);
    const h = Math.floor(area.clientHeight);
    if (w <= 0 || h <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.logicalW = w;
    this.logicalH = h;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padX = w * 0.02;
    const padTop = h * 0.012;
    const padBottom = h * 0.008;
    this.framePad = padX;
    this.boardTop = padTop;
    this.cannonX = w / 2;

    let bubbleR = (w - padX * 2) / (COLS * 2 + 0.5);
    const computeLayout = (R) => {
      const rowStep = R * Math.sqrt(3);
      const cannonBaseY = h - padBottom;
      const cannonY = cannonBaseY - R * 1.6;
      const launcherCenterY = cannonY - R * 0.15;
      const failLineY = launcherCenterY - R;
      const aimGap = R * 2 * AIM_GAP_DIAMETERS;
      const lowestBubbleBottom = failLineY - aimGap;
      const bottomOfMaxRow = padTop + (MAX_ROWS - 1) * rowStep + R * 2;
      return {
        rowStep,
        cannonBaseY,
        cannonY,
        failLineY,
        lowestBubbleBottom,
        bottomOfMaxRow,
        aimZoneTop: lowestBubbleBottom - R * 2
      };
    };

    let layout = computeLayout(bubbleR);
    while (layout.bottomOfMaxRow > layout.failLineY && bubbleR > 8) {
      bubbleR *= 0.96;
      layout = computeLayout(bubbleR);
    }

    this.bubbleR = bubbleR;
    this.rowStep = layout.rowStep;
    this.cannonBaseY = layout.cannonBaseY;
    this.cannonY = layout.cannonY;
    this.dangerY = layout.failLineY;
    this.aimZoneTop = Math.max(padTop, layout.aimZoneTop);
    this.aimZoneBottom = layout.failLineY;
    const gridW = this.gridPixelWidth();
    this.boardLeft = (w - gridW) / 2;
    this.updateLayoutCache();
    if (this.grid.length && !this.gameOver) this.checkGameOver();
    this.draw();
  }

  setLocked(v) { this.locked = v; }

  resetGame(save = true) {
    this.score = 0;
    this.gameOver = false;
    this.locked = false;
    this.shotsSinceDrop = 0;
    this.flying = null;
    this.busy = false;
    this.aiming = false;
    this.animPop = null;
    this.animDrop = null;
    this.initGrid();
    this.currentColor = this.randomColor();
    this.nextColor = this.randomColor();
    this.notifyState();
    this.draw();
    if (save) this.callbacks.onSave?.();
  }

  initGrid() {
    this.grid = Array.from({ length: MAX_ROWS }, () => Array(COLS).fill(null));
    const rows = Math.min(INITIAL_ROWS, Math.max(1, this.maxPlayRow));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < this.colsInRow(r); c++) {
        this.grid[r][c] = this.randomColorForNewRow(r, c);
      }
    }
  }

  colorCount() {
    if (this.score >= 2000) return 5;
    if (this.score >= 800) return 4;
    return 3;
  }

  randomColor() {
    return Math.floor(Math.random() * this.colorCount());
  }

  randomColorAvoidMatch(r, c) {
    for (let t = 0; t < 8; t++) {
      const color = this.randomColor();
      if (this.clusterSizeAt(r, c, color) < MIN_MATCH) return color;
    }
    return this.randomColor();
  }

  randomColorForNewRow(r, c) {
    for (let t = 0; t < 12; t++) {
      const color = this.randomColor();
      if (this.clusterSizeAt(r, c, color) < INITIAL_MAX_CLUSTER) return color;
    }
    return this.randomColor();
  }

  clusterSizeAt(r, c, color) {
    let count = 0;
    const seen = new Set();
    const stack = [[r, c]];
    while (stack.length) {
      const [rr, cc] = stack.pop();
      const k = `${rr},${cc}`;
      if (seen.has(k)) continue;
      const cellColor = this.cellColorAt(rr, cc, r, c, color);
      if (cellColor !== color) continue;
      seen.add(k);
      count++;
      this.getNeighbors(rr, cc).forEach(([nr, nc]) => stack.push([nr, nc]));
    }
    return count;
  }

  getDownSlot(r, c) {
    const nr = r + 1;
    if (nr > this.maxPlayRow) return null;
    const dstCols = this.colsInRow(nr);
    if (r % 2 === 0 && nr % 2 === 1) {
      if (c >= dstCols) return null;
      return [nr, c];
    }
    if (c >= dstCols) return null;
    return [nr, c];
  }

  cellColorAt(r, c, pendingR, pendingC, pendingColor) {
    if (r === pendingR && c === pendingC) return pendingColor;
    return this.grid[r]?.[c] ?? null;
  }

  wouldMatchAt(r, c, color) {
    return this.clusterSizeAt(r, c, color) >= MIN_MATCH;
  }

  getNeighbors(r, c) {
    const even = r % 2 === 0;
    const deltas = even
      ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
      : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
    return deltas
      .map(([dr, dc]) => [r + dr, c + dc])
      .filter(([nr, nc]) => nr >= 0 && nr < MAX_ROWS && nc >= 0 && nc < this.colsInRow(nr));
  }

  canvasPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.logicalW,
      y: ((e.clientY - rect.top) / rect.height) * this.logicalH
    };
  }

  updateAimFromPoint(x, y) {
    const dx = x - this.cannonX;
    const dy = y - this.cannonY;
    if (dy >= 4) return;
    const a = Math.atan2(dy, dx);
    this.aimAngle = Math.max(-Math.PI + 0.12, Math.min(-0.12, a));
  }

  onPointerDown(e) {
    if (!this.canPlay()) return;
    GameAudio.resume();
    this.aiming = true;
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
    const p = this.canvasPoint(e);
    this.updateAimFromPoint(p.x, p.y);
    this.draw();
  }

  onPointerMove(e) {
    if (!this.aiming) return;
    const p = this.canvasPoint(e);
    this.updateAimFromPoint(p.x, p.y);
    this.draw();
  }

  onPointerUp(e) {
    if (!this.aiming || !this.canPlay()) return;
    this.aiming = false;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    const p = this.canvasPoint(e);
    this.updateAimFromPoint(p.x, p.y);
    this.shoot();
  }

  swapBubble() {
    if (!this.canPlay()) return;
    [this.currentColor, this.nextColor] = [this.nextColor, this.currentColor];
    GameAudio.swap();
    this.draw();
  }

  shoot() {
    const speed = this.bubbleR * 24;
    const mouthX = this.cannonX + Math.cos(this.aimAngle) * this.bubbleR * 0.15;
    const mouthY = this.cannonY + Math.sin(this.aimAngle) * this.bubbleR * 0.15;
    this.flying = {
      x: mouthX,
      y: mouthY,
      vx: Math.cos(this.aimAngle) * speed,
      vy: Math.sin(this.aimAngle) * speed,
      color: this.currentColor
    };
    GameAudio.shoot();
    this.animateFlying();
  }

  animateFlying() {
    const left = this.playfieldLeft();
    const right = this.playfieldRight();
    const top = this.boardTop + this.bubbleR;
    let last = performance.now();

    const step = (now) => {
      const b = this.flying;
      if (!b) return;

      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < left) { b.x = left; b.vx *= -1; }
      else if (b.x > right) { b.x = right; b.vx *= -1; }

      if (b.y <= top) {
        b.y = top;
        this.landBubble(b.x, b.y);
        return;
      }

      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < this.colsInRow(r); c++) {
          if (this.grid[r][c] == null) continue;
          const { x, y } = this.cellCenter(r, c);
          if (Math.hypot(b.x - x, b.y - y) < this.bubbleR * 1.85) {
            this.landBubble(b.x, b.y, r, c);
            return;
          }
        }
      }

      this.draw();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  findSnapSlot(x, y, hitR, hitC) {
    const anchored = this.buildAnchoredSet();
    const candidates = [];
    const tryAdd = (r, c) => {
      if (!this.isAttachableSlot(r, c, anchored)) return;
      const { x: cx, y: cy } = this.cellCenter(r, c);
      candidates.push({ r, c, d: Math.hypot(x - cx, y - cy) });
    };

    if (hitR != null) {
      this.getNeighbors(hitR, hitC).forEach(([nr, nc]) => tryAdd(nr, nc));
    }

    const estR = Math.max(0, Math.min(this.maxPlayRow, Math.round((y - this.boardTop) / this.rowStep)));
    const estC = Math.round((x - this.boardLeft - this.rowOffsetX(estR)) / (this.bubbleR * 2));
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -2; dc <= 2; dc++) tryAdd(estR + dr, estC + dc);
    }

    if (!candidates.length) {
      for (let r = 0; r <= this.maxPlayRow; r++) {
        for (let c = 0; c < this.colsInRow(r); c++) {
          tryAdd(r, c);
        }
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.d - b.d);
    return [candidates[0].r, candidates[0].c];
  }

  async landBubble(x, y, hitR, hitC) {
    this.flying = null;
    const slot = this.findSnapSlot(x, y, hitR, hitC);
    if (!slot) {
      this.draw();
      return;
    }

    const [r, c] = slot;
    this.grid[r][c] = this.currentColor;
    this.currentColor = this.nextColor;
    this.nextColor = this.randomColor();
    this.shotsSinceDrop++;

    if (this.checkGameOver()) {
      this.draw();
      return;
    }

    await this.processTurn(r, c);
  }

  async processTurn(r, c) {
    if (this.gameOver) return;
    this.busy = true;

    const matched = this.findCluster(r, c, this.grid[r][c]);
    if (matched.length >= MIN_MATCH) {
      await this.popCells(matched, 10);
    }

    await this.dropAllOrphans();

    if (this.finishTurnIfOverLine()) return;

    if (!this.gameOver && this.shotsSinceDrop >= SHOTS_BEFORE_DROP) {
      this.shotsSinceDrop = 0;
      this.pushCeiling();
      await this.dropAllOrphans();
      if (this.finishTurnIfOverLine()) return;
    }

    this.busy = false;
    this.notifyState();
    this.draw();
    this.callbacks.onSave?.();
    this.checkGameOver();
  }

  finishTurnIfOverLine() {
    if (!this.checkGameOver()) return false;
    this.busy = false;
    this.notifyState();
    this.draw();
    return true;
  }

  findCluster(r, c, color) {
    if (color == null) return [];
    const out = [];
    const seen = new Set();
    const stack = [[r, c]];
    while (stack.length) {
      const [rr, cc] = stack.pop();
      const k = `${rr},${cc}`;
      if (seen.has(k) || this.grid[rr]?.[cc] !== color) continue;
      seen.add(k);
      out.push([rr, cc]);
      this.getNeighbors(rr, cc).forEach(([nr, nc]) => stack.push([nr, nc]));
    }
    return out;
  }

  findOrphans() {
    const anchored = this.buildAnchoredSet();
    const orphans = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < this.colsInRow(r); c++) {
        if (this.grid[r][c] != null && !anchored.has(`${r},${c}`)) {
          orphans.push([r, c]);
        }
      }
    }
    return orphans;
  }

  async dropAllOrphans() {
    if (this.gameOver) return;
    let safety = 8;
    while (!this.gameOver && safety-- > 0) {
      const orphans = this.findOrphans();
      if (!orphans.length) break;
      this.score += orphans.length * 20;
      GameAudio.drop();
      await this.animateFalling(orphans);
    }
  }

  popCells(cells, pointsEach) {
    return new Promise((resolve) => {
      const snapshots = cells.map(([r, c]) => ({ r, c, color: this.grid[r][c] }));
      cells.forEach(([r, c]) => { this.grid[r][c] = null; });
      this.score += cells.length * pointsEach;
      GameAudio.pop(cells.length);
      this.animPop = { snapshots, t: 0 };

      const tick = () => {
        if (this.gameOver) {
          this.animPop = null;
          resolve();
          return;
        }
        this.animPop.t += 0.14;
        this.draw();
        if (this.animPop.t < 1) requestAnimationFrame(tick);
        else {
          this.animPop = null;
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  animateFalling(cells) {
    return new Promise((resolve) => {
      if (!cells.length) {
        resolve();
        return;
      }
      const gravity = this.bubbleR * 36;
      const despawnY = this.logicalH + this.bubbleR * 2;
      const bubbles = cells.map(([r, c]) => {
        const { x, y } = this.cellCenter(r, c);
        const color = this.grid[r][c];
        return {
          x, y,
          color,
          vy: this.bubbleR * 2,
          vx: (Math.random() - 0.5) * this.bubbleR * 2.5,
          spin: (Math.random() - 0.5) * 0.12,
          done: false
        };
      });
      cells.forEach(([r, c]) => { this.grid[r][c] = null; });

      let last = performance.now();
      const tick = (now) => {
        if (this.gameOver) {
          this.animDrop = null;
          resolve();
          return;
        }
        const dt = Math.min((now - last) / 1000, 0.032);
        last = now;
        let alive = 0;

        bubbles.forEach((b) => {
          if (b.done) return;
          b.vy += gravity * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.spin += 0.06;
          if (b.y >= despawnY) {
            b.done = true;
            return;
          }
          alive++;
        });

        this.animDrop = { bubbles };
        this.draw();
        if (alive > 0) requestAnimationFrame(tick);
        else {
          this.animDrop = null;
          this.draw();
          resolve();
        }
      };
      this.animDrop = { bubbles };
      this.draw();
      requestAnimationFrame(tick);
    });
  }

  pushCeiling() {
    const snap = this.grid.map((row) => row.slice());
    const limit = this.maxPlayRow;
    const next = Array.from({ length: MAX_ROWS }, () => Array(COLS).fill(null));

    for (let r = limit; r >= 0; r--) {
      for (let c = 0; c < this.colsInRow(r); c++) {
        const color = snap[r][c];
        if (color == null) continue;
        const slot = this.getDownSlot(r, c);
        if (!slot) continue;
        const [nr, nc] = slot;
        if (next[nr][nc] != null) continue;
        next[nr][nc] = color;
      }
    }

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < COLS; c++) this.grid[r][c] = null;
    }
    for (let r = 1; r <= limit; r++) {
      for (let c = 0; c < this.colsInRow(r); c++) {
        this.grid[r][c] = next[r][c];
      }
    }

    for (let c = 0; c < this.colsInRow(0); c++) {
      this.grid[0][c] = this.randomColorForNewRow(0, c);
    }
  }

  checkGameOver() {
    if (this.gameOver) return true;
    const failY = this.failLineY();
    let lowestRow = -1;
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < this.colsInRow(r); c++) {
        if (this.grid[r][c] == null) continue;
        const { y } = this.cellCenter(r, c);
        if (this.bubbleBottom(y) >= failY) {
          this.endGame();
          return true;
        }
        if (r > lowestRow) lowestRow = r;
      }
    }
    if (lowestRow >= this.maxPlayRow) {
      this.endGame();
      return true;
    }
    return false;
  }

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.locked = true;
    this.busy = false;
    this.flying = null;
    this.aiming = false;
    this.animPop = null;
    this.animDrop = null;
    this.callbacks.onGameOver?.({ score: this.score });
  }

  getAimDots() {
    const a = this.flying ? Math.atan2(this.flying.vy, this.flying.vx) : this.aimAngle;
    let x = this.cannonX;
    let y = this.cannonY - this.bubbleR * 0.15;
    let vx = Math.cos(a);
    let vy = Math.sin(a);
    const left = this.playfieldLeft();
    const right = this.playfieldRight();
    const top = this.boardTop + this.bubbleR;
    const step = this.bubbleR * 0.55;
    const dots = [{ x, y }];
    let bounces = 0;

    for (let i = 0; i < 120; i++) {
      x += vx * step;
      y += vy * step;
      if (y <= top) break;
      if (x <= left) { x = left; vx *= -1; if (++bounces > 2) break; }
      else if (x >= right) { x = right; vx *= -1; if (++bounces > 2) break; }
      if (i % 2 === 0) dots.push({ x, y });
    }
    return dots;
  }

  notifyState() {
    this.callbacks.onStateChange?.({ score: this.score });
  }

  serialize() {
    return {
      score: this.score,
      grid: this.grid.map((row) => [...row]),
      currentColor: this.currentColor,
      nextColor: this.nextColor,
      shotsSinceDrop: this.shotsSinceDrop,
      locked: this.locked,
      gameOver: this.gameOver
    };
  }

  restoreState(data) {
    if (!data?.grid) return false;
    this.score = data.score || 0;
    this.grid = data.grid.map((row) => [...row]);
    this.currentColor = data.currentColor ?? 0;
    this.nextColor = data.nextColor ?? 0;
    this.shotsSinceDrop = data.shotsSinceDrop || 0;
    this.gameOver = !!data.gameOver;
    this.locked = data.locked ?? this.gameOver;
    this.busy = false;
    this.flying = null;
    this.animPop = null;
    this.animDrop = null;
    this.aiming = false;
    this.updateLayoutCache();
    this.stripInvalidGridCells();
    this.notifyState();
    this.draw();
    this.checkGameOver();
    return !this.gameOver;
  }

  stripInvalidGridCells() {
    const orphans = this.findOrphans();
    orphans.forEach(([r, c]) => { this.grid[r][c] = null; });
    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < this.colsInRow(r); c++) {
        if (this.grid[r][c] == null) continue;
        if (r > this.maxPlayRow) this.grid[r][c] = null;
      }
    }
  }

  drawBubble(x, y, colorIdx, scale = 1, alpha = 1, spin = 0) {
    const pal = COLORS[colorIdx];
    if (!pal) return;
    const ctx = this.ctx;
    const R = this.bubbleR * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(spin);

    const grad = ctx.createRadialGradient(-R * 0.34, -R * 0.36, R * 0.04, R * 0.06, R * 0.08, R);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.22, pal.light);
    grad.addColorStop(0.62, pal.fill);
    grad.addColorStop(1, pal.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R - 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath();
    ctx.ellipse(-R * 0.28, -R * 0.32, R * 0.22, R * 0.13, -0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, R - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawFrame(w, h) {
    const ctx = this.ctx;
    ctx.save();

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2a1060');
    sky.addColorStop(0.4, '#4a2088');
    sky.addColorStop(0.75, '#5a2898');
    sky.addColorStop(1, '#3a1868');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(100, 180, 255, 0.04)';
    ctx.fillRect(this.framePad, this.boardTop, w - this.framePad * 2, this.aimZoneTop - this.boardTop);

    ctx.fillStyle = 'rgba(120, 200, 255, 0.06)';
    ctx.fillRect(this.framePad, this.aimZoneTop, w - this.framePad * 2, this.aimZoneBottom - this.aimZoneTop);

    ctx.setLineDash([8, 7]);
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 60, 60, 0.55)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(this.framePad, this.failLineY());
    ctx.lineTo(w - this.framePad, this.failLineY());
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawAimLine() {
    if (!this.canPlay() && !this.flying) return;
    if (!this.aiming && !this.flying) return;
    const ctx = this.ctx;
    const dots = this.getAimDots();
    ctx.save();
    dots.forEach((pt, i) => {
      const t = i / Math.max(1, dots.length - 1);
      ctx.globalAlpha = 0.35 + (1 - t) * 0.55;
      ctx.fillStyle = '#88FF66';
      ctx.shadowColor = '#66FF44';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, this.bubbleR * (0.14 + (1 - t) * 0.06), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawCannon() {
    const ctx = this.ctx;
    const cx = this.cannonX;
    const mouthY = this.cannonY;
    const baseY = this.cannonBaseY;
    const R = this.bubbleR;

    this.drawBubble(cx - R * 2.5, mouthY + R * 0.12, this.nextColor, 0.72);

    ctx.save();
    const bodyGrad = ctx.createLinearGradient(cx, mouthY, cx, baseY);
    bodyGrad.addColorStop(0, '#88E878');
    bodyGrad.addColorStop(1, '#48A838');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#C878F0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - R * 1.1, baseY);
    ctx.quadraticCurveTo(cx - R * 1.3, mouthY + R * 0.3, cx - R * 0.55, mouthY);
    ctx.arc(cx, mouthY, R * 0.55, Math.PI, 0);
    ctx.quadraticCurveTo(cx + R * 1.3, mouthY + R * 0.3, cx + R * 1.1, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    this.drawBubble(
      cx + Math.cos(this.aimAngle) * R * 0.15,
      mouthY + Math.sin(this.aimAngle) * R * 0.15,
      this.currentColor
    );
  }

  draw() {
    const w = this.logicalW;
    const h = this.logicalH;
    if (!w || !h || !this.grid.length) return;

    this.ctx.clearRect(0, 0, w, h);
    this.drawFrame(w, h);

    for (let r = 0; r < MAX_ROWS; r++) {
      for (let c = 0; c < this.colsInRow(r); c++) {
        const color = this.grid[r][c];
        if (color == null) continue;
        const { x, y } = this.cellCenter(r, c);
        this.drawBubble(x, y, color);
      }
    }

    if (this.animPop) {
      this.animPop.snapshots.forEach(({ r, c, color }) => {
        const { x, y } = this.cellCenter(r, c);
        const alpha = 1 - this.animPop.t;
        if (alpha > 0.02) {
          this.drawBubble(x, y, color, 1 - this.animPop.t * 0.85, alpha);
        }
      });
    }

    if (this.animDrop) {
      this.animDrop.bubbles.forEach((b) => {
        if (!b.done) {
          this.drawBubble(b.x, b.y, b.color, 1, 1, b.spin);
        }
      });
    }

    if (this.flying) {
      this.drawBubble(this.flying.x, this.flying.y, this.flying.color);
    }

    this.drawAimLine();
    this.drawCannon();
  }
}

window.BubbleShooterGame = BubbleShooterGame;
