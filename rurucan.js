const VERSION = "ver.0.0.18";

const isPad = (typeof browser === "undefined");
if (isPad) {
  window.browser = {
    storage: {
      local: {
        get(key) {
          return {
            [key]: localStorage.getItem(key),
          };
        },
        set(obj) {
          for (var key in obj) {
            localStorage.setItem(key, obj[key]);
          }
        },
      },
    },
  };
}

let errorBox;

function logError(a) {
  console.log(a);
  if (isPad) {
    if (!errorBox) {
      errorBox = document.createElement("textarea");
      errorBox.setAttribute("rows", "20");
      errorBox.setAttribute("cols", "80");
      document.body.firstChild.before(errorBox);
    }
    errorBox.value += a + "\n";
  }
}

function sleep(t) {
  return new Promise(r => setTimeout(r, t));
}

function widthCal(v) {
  return parseInt(24 - v * 23 / 54, 10);
}
function widthCalInv(v) {
  return Math.floor(((24 - parseInt(v, 10)) * 54) / 23);
}

const origTools = [
  { name: "P1", size: 1, type: "p" },
  { name: "P2", size: 2, type: "p" },
  { name: "P8", size: 8, type: "p" },
  "-",
  { name: "E1", size: 1, type: "e" },
  { name: "E2", size: 2, type: "e" },
  { name: "E8", size: 8, type: "e" },
  "-",
  { name: "下", size: 1, type: "w" },
];

const tools = JSON.parse(JSON.stringify(origTools));

const W1 = tools.find(x => x.name == "下");
const P2 = tools.find(x => x.name == "P2");
const E8 = tools.find(x => x.name == "E8");

let currentTool = P2;
let currentColor = "800000";

const modes = [
  { name: "S", mode: "source-over" },
  { name: "L", mode: "lighten" },
  { name: "D", mode: "darken" },
];

let currentMode = modes[0];

const cs = [0, 0.4, 0.6, 0.7, 0.8, 0.9, 1]
.map(a => rgbHex(0xF0 * a + 0x80 * (1 - a),
                 0xE0 * a + 0x00 * (1 - a),
                 0xD6 * a + 0x00 * (1 - a)));

function to16(num) {
  return ("0" + num.toString(16)).slice(-2);
}

function rgbHex(r, g, b) {
  return to16(Math.round(r)) + to16(Math.round(g)) + to16(Math.round(b));
}

function toHexColor(col) {
  if (col.charAt(0) == "#"){
    return col.substr(1);
  }
  col = col.replace("rgb(", "");
  col = col.replace(")", "");
  col = col.split(",");
  let r = parseInt(col[0]),
      g = parseInt(col[1]),
      b = parseInt(col[2]);
  return rgbHex(r, g, b);
}

function hexToRGB(col) {
  const m = col.match(/([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})/);
  if (!m) {
    return { r: 0, g: 0, b: 0 };
  }
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return {r, g, b};
}

function onCanvas(oeBox, canvas, palette, cBox, pli, slider, oest3,
                  sliderin, sliderout,
                  oepb, ftxa, oebtnud, swfContents) {
  for (let n of [...document.getElementsByClassName("rurucan-generated")]) {
    n.remove();
  }

  const td = swfContents.parentNode;

  td.style.paddingLeft = "16px";
  td.style.paddingBottom = "32px";
  td.style.paddingTop = "32px";
  palette.style.left = "32px";

  palette.style.touchAction = "manipulation";

  cBox.style.position = "relative";

  let MIX, PICK;

  const MODE_PICK = 1;
  const MODE_MIX = 2;

  let preventMode = 0;

  let cx = 0, cy = 0;

  const cFrame = document.createElement("div");

  function setPreventMode(mode) {
    preventMode = mode;
    if (preventMode) {
      cFrame.style.display = "";
    } else {
      cFrame.style.display = "none";
    }
  }

  cFrame.className = "rurucan-generated";
  cFrame.style.boxSizing = "border-box";
  cFrame.style.width = canvas.width + "px";
  cFrame.style.height = canvas.height + "px";
  cFrame.style.position = "absolute";
  cFrame.style.display = "none";
  cFrame.style.left = "0px";
  cFrame.style.top = "0px";
  cFrame.style.outline = "1px dotted black";
  cFrame.addEventListener("pointerdown", e => {
    if (preventMode) {
      e.preventDefault();
      e.stopPropagation();

      cx = e.offsetX;
      cy = e.offsetY;
      if (preventMode === MODE_PICK) {
        PICK.style.backgroundColor = "#F0E0D6";
        pick();
      }
      if (preventMode === MODE_MIX) {
        MIX.style.backgroundColor = "#F0E0D6";
        mix();
      }
    }
  });
  cFrame.addEventListener("pointerup", e => {
    if (preventMode) {
      e.preventDefault();
      e.stopPropagation();

      setPreventMode(0);
    }
  });
  cFrame.addEventListener("pointermove", e => {
    if (preventMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  cBox.appendChild(cFrame);

  let ignoreClick = 0;
  oest3.addEventListener("click", () => {
    if (Date.now() < ignoreClick + 100) {
      return;
    }
    currentTool.size = getSize();
  });

  function getSize() {
    return widthCal(sliderout.value);
  }

  function setSize(s) {
    const { left, top } = slider.getBoundingClientRect();

    ignoreClick = Date.now();
    slider.dispatchEvent(new MouseEvent("click", {
      clientX: left,
      clientY: top + widthCalInv(s) + sliderin.clientHeight / 2,
      bubbles: true,
      cancelable: true,
    }));
  }

  let R, G, B, RGB;

  function reflectColor() {
    if (currentTool.type == "e") {
      setColor("F0E0D6");
    } else if (currentTool.type == "w") {
      setColor("FFFFFF");
    } else {
      setColor(currentColor);
    }
  }

  function setCurrentColor(c) {
    currentColor = c;
    reflectColor();
  }

  function setColor(c, reflectSlider=true) {
    pli.value = c;
    RGB.value = c;

    pli.dispatchEvent(new KeyboardEvent("keypress", {
      keyCode: 13,
      bubbles: true,
      cancelable: true,
    }));

    if (reflectSlider) {
      R.value = parseInt(c.slice(0, 2), 16);
      G.value = parseInt(c.slice(2, 4), 16);
      B.value = parseInt(c.slice(4, 6), 16);
    }
  }

  palette.style.position = "relative";

  const toolBox = document.createElement("div");
  toolBox.className = "rurucan-generated";
  toolBox.style.position = "absolute";
  toolBox.style.right = "-40px";
  toolBox.style.top = "0px";
  toolBox.style.width = "30px";
  toolBox.style.height = "100px";
  palette.appendChild(toolBox);

  function createToolButton() {
    const toolItem = document.createElement("div");
    toolItem.style.width = "30px";
    toolItem.style.height = "20px";
    toolItem.style.border = "1px solid #800000";
    toolItem.style.boxSizing = "border-box";
    toolItem.style.fontSize = "12px";
    toolItem.style.fontWeight = "bold";
    toolItem.style.lineHeight = "12px";
    toolItem.style.backgroundColor = "#F0E0D6";
    toolBox.appendChild(toolItem);

    return toolItem;
  }

  function createToolSep(h = 4) {
    const toolSep = document.createElement("div");
    toolSep.style.width = "30px";
    toolSep.style.height = h + "px";
    toolSep.style.clear = "both";
    toolBox.appendChild(toolSep);
  }

  function setTool(t) {
    currentTool.element.style.backgroundColor = "#F0E0D6";

    currentTool = t;

    currentTool.element.style.backgroundColor = "#CE9C95";

    setSize(t.size);
    reflectColor();
  }

  for (const t of tools) {
    if (t == "-") {
      createToolSep();
      continue;
    }

    const toolItem = createToolButton();
    toolItem.textContent = t.name;
    toolItem.style.backgroundColor = t == currentTool ? "#CE9C95" : "#F0E0D6";

    t.element = toolItem;

    toolItem.addEventListener("click", () => {
      setTool(t);
    });
  }

  const clear = createToolButton();
  clear.textContent = "下消";
  clear.addEventListener("click", () => {
    let context = canvas.getContext("2d");
    let w = canvas.width, h = canvas.height;
    let imageData = context.getImageData(0, 0, w, h);
    let data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      let Y = (r + r + b + g + g + g) / 6;
      if (Y > 227) {
        r = 0xF0;
        g = 0xE0;
        b = 0xD6;
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
    context.putImageData(imageData, 0, 0);
  });

  createToolSep();

  function resetTool() {
    for (let i = 0; i < tools.length; i ++) {
      tools[i].size = origTools[i].size;
    }

    setSize(currentTool.size);
    setCurrentColor("800000");
  }

  const reset = createToolButton();
  reset.textContent = "リセ";
  reset.addEventListener("click", () => {
    resetTool();
  });

  const colorBox = document.createElement("div");
  colorBox.className = "rurucan-generated";
  colorBox.style.position = "absolute";
  colorBox.style.right = "-150px";
  colorBox.style.top = "0px";
  colorBox.style.width = "100px";
  colorBox.style.height = "100px";
  palette.appendChild(colorBox);

  function createColorItem() {
    const colorItem = document.createElement("div");
    colorItem.style.width = "60px";
    colorItem.style.height = "16px";
    colorItem.style.border = "1px solid #800000";
    colorItem.style.boxSizing = "border-box";
    colorBox.appendChild(colorItem);

    return colorItem;
  }

  function createColorSep(h = 4) {
    const colorSep = document.createElement("div");
    colorSep.style.clear = "both";
    colorSep.style.width = "30px";
    colorSep.style.height = h + "px";
    colorBox.appendChild(colorSep);
  }

  for (const c of cs) {
    const colorItem = createColorItem();
    colorItem.style.backgroundColor = `#${c}`;

    colorItem.addEventListener("click", () => {
      setCurrentColor(c);
    });
  }

  function createFileSep(h = 4) {
    const fileSep = document.createElement("div");
    fileSep.style.clear = "both";
    fileSep.style.width = "30px";
    fileSep.style.height = h + "px";
    fileBox.appendChild(fileSep);
  }

  const fileBox = document.createElement("div");
  fileBox.className = "rurucan-generated";
  fileBox.style.position = "absolute";
  fileBox.style.right = "-220px";
  fileBox.style.top = "0px";
  fileBox.style.width = "60px";
  fileBox.style.height = "100px";
  palette.appendChild(fileBox);

  function createModeItem() {
    const modeItem = document.createElement("div");
    modeItem.style.width = "18px";
    modeItem.style.height = "20px";
    modeItem.style.border = "1px solid #800000";
    modeItem.style.boxSizing = "border-box";
    modeItem.style.fontSize = "12px";
    modeItem.style.fontWeight = "bold";
    modeItem.style.lineHeight = "12px";
    modeItem.style.float = "left";
    colorBox.appendChild(modeItem);

    return modeItem;
  }

  function setMode(mode) {
    let context = canvas.getContext("2d");
    context.globalCompositeOperation = mode;
  }

  createColorSep();

  for (const m of modes) {
    const modeItem = createModeItem();
    modeItem.textContent = m.name;
    modeItem.style.backgroundColor = m == currentMode ? "#CE9C95" : "#F0E0D6";

    m.element = modeItem;

    modeItem.addEventListener("click", () => {
      currentMode.element.style.backgroundColor = "#F0E0D6";

      currentMode = m;

      currentMode.element.style.backgroundColor = "#CE9C95";

      setMode(m.mode);
    });
  }

  createColorSep();

  function createColorSlider() {
    let colorSlider = document.createElement("input");
    colorSlider.setAttribute("type", "range");
    colorSlider.setAttribute("min", 0);
    colorSlider.setAttribute("max", 255);
    colorSlider.style.width = "80px";
    colorBox.appendChild(colorSlider);

    return colorSlider;
  }

  function createColorInput() {
    let colorInput = document.createElement("input");
    colorInput.setAttribute("type", "text");
    colorInput.style.width = "80px";
    colorBox.appendChild(colorInput);

    return colorInput;
  }

  const H_MAX = 15;
  let historyButtons = [];
  let historyColors = [];

  async function loadH() {
    let tmp = await browser.storage.local.get("colors");
    tmp = JSON.parse(tmp.colors);
    if (tmp && tmp.length && tmp.length == H_MAX) {
      historyColors = tmp;
    }
    updateH();
  }

  async function saveH() {
    await browser.storage.local.set({ "colors": JSON.stringify(historyColors) });
  }

  function updateH() {
    for (let i = 0; i < H_MAX; i++) {
      historyButtons[i].style.backgroundColor = "#" + historyColors[i];
    }
  }

  function addColorHistory(c) {
    historyColors.unshift(c);
    historyColors.length = H_MAX;
    updateH();
    saveH().catch(e => logError(e));
  }

  function createPalButton() {
    const qItem = document.createElement("div");
    qItem.style.width = "18px";
    qItem.style.height = "20px";
    qItem.style.border = "1px solid #800000";
    qItem.style.boxSizing = "border-box";
    qItem.style.fontSize = "12px";
    qItem.style.fontWeight = "bold";
    qItem.style.lineHeight = "12px";
    qItem.style.float = "left";
    qItem.style.backgroundColor = "#F0E0D6";
    colorBox.appendChild(qItem);

    return qItem;
  }

  R = createColorSlider();
  G = createColorSlider();
  B = createColorSlider();

  PICK = createPalButton();
  PICK.textContent = "P";
  PICK.addEventListener("click", () => {
    if (preventMode) {
      PICK.style.backgroundColor = "#F0E0D6";
      setPreventMode(0);
    } else {
      PICK.style.backgroundColor = "#CE9C95";
      setPreventMode(MODE_PICK);
    }
  });

  MIX = createPalButton();
  MIX.textContent = "M";
  MIX.addEventListener("click", () => {
    if (preventMode) {
      MIX.style.backgroundColor = "#F0E0D6";
      setPreventMode(0);
    } else {
      MIX.style.backgroundColor = "#CE9C95";
      setPreventMode(MODE_MIX);
    }
  });

  RGB = createColorInput();
  {
    function onColorSlider(event) {
      let r = parseInt(R.value);
      let g = parseInt(G.value);
      let b = parseInt(B.value);
      setCurrentColor(rgbHex(r, g, b), false);
      addColorHistory(rgbHex(r, g, b));
    }

    R.addEventListener("change", onColorSlider);
    G.addEventListener("change", onColorSlider);
    B.addEventListener("change", onColorSlider);

    RGB.addEventListener("input", event => {
      if (RGB.value.match(/^[0-9A-Fa-f]{6}$/)) {
        setCurrentColor(RGB.value);
        addColorHistory(RGB.value);
      }
    });
  }

  for (let i = 0; i < H_MAX; i++) {
    let h = createModeItem();
    historyButtons.push(h);
    historyColors.push(currentColor);
    h.addEventListener("click", () => {
      setCurrentColor(historyColors[i]);
    });
  }
  loadH().catch(e => logError(e));

  setSize(currentTool.size);
  setColor(currentColor);

  function createFileItem() {
    const fileItem = document.createElement("div");
    fileItem.style.width = "40px";
    fileItem.style.height = "20px";
    fileItem.style.border = "1px solid #800000";
    fileItem.style.boxSizing = "border-box";
    fileItem.style.fontSize = "12px";
    fileItem.style.fontWeight = "bold";
    fileItem.style.lineHeight = "12px";
    fileItem.style.backgroundColor = "#F0E0D6";
    fileBox.appendChild(fileItem);

    return fileItem;
  }

  async function load(button, name) {
    try {
      button.style.backgroundColor = "#CE9C95";

      let D = await browser.storage.local.get(name);
      let tmp = JSON.parse(D[name]);
      if (!tmp.data || !tmp.w || !tmp.h) {
        button.style.backgroundColor = "#F0E0D6";
        logError("no data");
        return;
      }

      let d = tmp.data;
      setCanvasSize(tmp.w, tmp.h);

      let context = canvas.getContext("2d");
      let w = canvas.width, h = canvas.height;
      let imageData = context.getImageData(0, 0, w, h);
      let data = imageData.data;

      for (var i = 0; i < data.length; i ++) {
        data[i] = d[i];
      }

      context.putImageData(imageData, 0, 0);

      button.style.backgroundColor = "#F0E0D6";

      addUndo();
    } catch (e) {
      logError(e + "\n" + e.stack);
    }
  }

  async function save(button, name) {
    try {
      button.style.backgroundColor = "#CE9C95";

      let context = canvas.getContext("2d");
      let w = canvas.width, h = canvas.height;
      let imageData = context.getImageData(0, 0, w, h);
      let data = [...imageData.data];

      await browser.storage.local.set({ [name]: JSON.stringify({
        data, w, h
      }) });

      button.style.backgroundColor = "#F0E0D6";
    } catch (e) {
      logError(e + "\n" + e.stack);
    }
  }

  const loadButton = createFileItem();
  loadButton.textContent = "load";

  loadButton.addEventListener("click", async () => {
    await load(loadButton, "image");
  });

  const saveButton = createFileItem();
  saveButton.textContent = "save";

  saveButton.addEventListener("click", async () => {
    save(saveButton, "image");
  });

  createFileSep(24);

  const Q_MAX = 6;
  let q = 0;

  function createQSaveItem() {
    const qItem = document.createElement("div");
    qItem.style.width = "18px";
    qItem.style.height = "20px";
    qItem.style.border = "1px solid #800000";
    qItem.style.boxSizing = "border-box";
    qItem.style.fontSize = "12px";
    qItem.style.fontWeight = "bold";
    qItem.style.lineHeight = "12px";
    qItem.style.float = "left";
    qItem.style.backgroundColor = "#F0E0D6";
    fileBox.appendChild(qItem);

    return qItem;
  }

  let qs = [];
  for (let i = 0; i < Q_MAX; i++) {
    let qItem = createQSaveItem();
    qItem.textContent = i;
    qs.push(qItem);

    qItem.addEventListener("click", async () => {
      await load(qItem, "q" + i);
    });
  }

  let undos = [];
  let undo_i = 0;
  const UNDO_MAX = 32;
  function addUndo() {
    if (undo_i > 0) {
      undos = undos.slice(undo_i);
    }
    undo_i = 0;

    let context = canvas.getContext("2d");
    let w = canvas.width, h = canvas.height;

    undos.unshift(context.getImageData(0, 0, w, h));
    if (undos.length > UNDO_MAX) {
      undos.length = UNDO_MAX;
    }
  }

  function undo() {
    undo_i = undo_i + 1;
    if (undo_i > undos.length - 1) {
      undo_i = undos.length - 1;
    }
    let context = canvas.getContext("2d");
    context.putImageData(undos[undo_i], 0, 0);
  }

  function redo() {
    undo_i = undo_i - 1;
    if (undo_i < 0) {
      undo_i = 0;
    }
    let context = canvas.getContext("2d");
    context.putImageData(undos[undo_i], 0, 0);
  }

  oebtnud.style.display = "none";

  createToolSep(24);

  function createUndoButton() {
    const undoButton = document.createElement("div");
    undoButton.className = "rurucan-generated";
    undoButton.style.width = "12px";
    undoButton.style.height = "16px";
    undoButton.style.border = "1px solid #800000";
    undoButton.style.fontSize = "12px";
    undoButton.style.fontWeight = "bold";
    undoButton.style.lineHeight = "12px";
    undoButton.style.float = "left";
    undoButton.style.backgroundColor = "#F0E0D6";
    toolBox.appendChild(undoButton);

    return undoButton;
  }

  const undoButton = createUndoButton();
  undoButton.textContent = "<";
  undoButton.addEventListener("click", () => {
    undo();
  });

  const redoButton = createUndoButton();
  redoButton.textContent = ">";
  redoButton.addEventListener("click", () => {
    redo();
  });

  addUndo();

  createToolSep(24);

  const allDelButton = createToolButton();
  allDelButton.textContent = "全消";
  allDelButton.addEventListener("click", () => {
    let w = canvas.width, h = canvas.height;
    let context = canvas.getContext("2d");

    context.save();

    context.fillStyle = '#F0E0D6';
    context.fillRect(0, 0, w, h);

    context.restore();

    addUndo();
  });

  function getColor() {
    let context = canvas.getContext("2d");
    let w = canvas.width, h = canvas.height;
    let imageData = context.getImageData(0, 0, w, h);
    const r = imageData.data[(cx + cy * w) * 4 + 0];
    const g = imageData.data[(cx + cy * w) * 4 + 1];
    const b = imageData.data[(cx + cy * w) * 4 + 2];
    return {r, g, b};
  }
  function pick() {
    const {r, g, b} = getColor();
    setCurrentColor(rgbHex(r, g, b));
  }
  function mix() {
    const {r: r1, g: g1, b: b1} = getColor();
    const {r: r2, g: g2, b: b2} = hexToRGB(currentColor);
    setCurrentColor(rgbHex((r1 + r2) / 2,
                           (g1 + g2) / 2,
                           (b1 + b2) / 2));
  }

  function fill(e) {
    let context = canvas.getContext("2d");
    let w = canvas.width, h = canvas.height;
    let imageData = context.getImageData(0, 0, w, h);

    const or = imageData.data[(cx + cy * w) * 4 + 0];
    const og = imageData.data[(cx + cy * w) * 4 + 1];
    const ob = imageData.data[(cx + cy * w) * 4 + 2];

    const r = parseInt(currentColor.slice(0, 2), 16);
    const g = parseInt(currentColor.slice(2, 4), 16);
    const b = parseInt(currentColor.slice(4, 6), 16);

    if (near(r, or) && near(g, og) && near(b, ob)) {
      return;
    }

    const next = [];
    next.push([cx, cy]);

    function near(a, b) {
      return b - 8 < a && a < b + 8;
    }

    while (next.length > 0) {
      const [x, y] = next.pop();
      const cr = imageData.data[(x + y * w) * 4 + 0];
      const cg = imageData.data[(x + y * w) * 4 + 1];
      const cb = imageData.data[(x + y * w) * 4 + 2];

      if (near(cr, or) && near(cg, og) && near(cb, ob)) {
        imageData.data[(x + y * w) * 4 + 0] = r;
        imageData.data[(x + y * w) * 4 + 1] = g;
        imageData.data[(x + y * w) * 4 + 2] = b;
        next.push([x - 1, y]);
        next.push([x + 1, y]);
        next.push([x, y - 1]);
        next.push([x, y + 1]);
      }
    }

    context.putImageData(imageData, 0, 0);

    addUndo();
  }

  let timer;
  let drawn = false;
  let inCanvas = false;
  let disableMenu = true;
  let moveFast = false;
  canvas.addEventListener("pointermove", e => {
    cx = e.offsetX;
    cy = e.offsetY;
  });
  td.addEventListener("pointerenter", () => {
    inCanvas = true;
  });
  td.addEventListener("pointerleave", () => {
    inCanvas = false;
  });
  let prevToolForE = null;
  {
    canvas.classList.add("x-gesture-disable");
    td.classList.add("x-gesture-disable");

    const onDown = e => {
      if (e.button == 1) {
        // middle
        e.preventDefault();
        e.stopPropagation();

        undo();

        return;
      }

      if (e.button == 2) {
        // secondary
        e.preventDefault();
        e.stopPropagation();

        prevToolForE = currentTool;
        if (prevToolForE.type == "e") {
          prevToolForE = P2;
        }
        setTool(E8);

        return;
      }
    };

    const onUp = e => {
      if (e.button == 1) {
        // middle
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      if (e.button == 2) {
        // secondary
        e.preventDefault();
        e.stopPropagation();

        setTool(prevToolForE);

        return;
      }
    };

    canvas.addEventListener("pointerdown", onDown, true);
    td.addEventListener("pointerdown", onDown, true);
    canvas.addEventListener("pointerup", onUp, true);
    td.addEventListener("pointerup", onUp, true);

    window.addEventListener("contextmenu", e => {
      if (!inCanvas || !disableMenu) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }
  document.body.addEventListener("keydown", e => {
    if (!inCanvas) {
      return;
    }
    if (e.key == "Meta") {
      pick();
    }
    if (e.key == "Control") {
      mix();
    }
  });
  document.body.addEventListener("keyup", e => {
    if (!inCanvas) {
      return;
    }
  });
  document.body.addEventListener("keypress", e => {
    if (!inCanvas) {
      return;
    }
    if (e.key == "z") {
      undo();
    }
    if (e.key == "x") {
      redo();
    }
    if (e.key == "q") {
      currentTool.size = Math.max(getSize() - 1, 1);
      setSize(currentTool.size);
    }
    if (e.key == "w") {
      currentTool.size = Math.min(getSize() + 1, 24);
      setSize(currentTool.size);
    }
    if (e.key == "f") {
      fill(e);
    }
  });
  function onDraw(e) {
    if (e.buttons & 5) {
      // primary or middle
      drawn = true;
    }
  }
  canvas.addEventListener("pointermove", onDraw);
  function onDrawEnd() {
    if (!drawn) {
      return;
    }
    drawn = false;
    addUndo();
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(async () => {
      let N = q;
      q = (q + 1) % Q_MAX;
      await save(qs[N], "q" + N);
    }, 2000);
  }
  document.body.addEventListener("pointerup", onDrawEnd);

  createFileSep(24);

  function createSizeItem() {
    const fileItem = document.createElement("div");
    fileItem.style.width = "60px";
    fileItem.style.height = "20px";
    fileItem.style.border = "1px solid #800000";
    fileItem.style.boxSizing = "border-box";
    fileItem.style.fontSize = "12px";
    fileItem.style.fontWeight = "bold";
    fileItem.style.lineHeight = "12px";
    fileItem.style.backgroundColor = "#F0E0D6";
    fileBox.appendChild(fileItem);

    return fileItem;
  }

  function setCanvasSize(w, h) {
    let context = canvas.getContext("2d");
    let ow = canvas.width, oh = canvas.height;
    let imageData = context.getImageData(0, 0, ow, oh);

    oeBox.style.width = `${w + 46}px`;
    oeBox.style.height = `${h}px`;
    ftxa.style.width = `${w + 46}px`;
    ftxa.style.height = `${h}px`;
    canvas.width = w;
    canvas.height = h;
    cFrame.width = w;
    cFrame.height = h;

    {
      let context = canvas.getContext("2d");

      context.save();

      context.fillStyle = '#F0E0D6';
      context.fillRect(0, 0, w, h);

      context.restore();

      context.putImageData(imageData, 0, 0);
    }
  }

  const sizes = [
    [344, 135],
    [400, 200],
    [400, 300],
    [400, 400],
    [300, 400],
    [200, 400],
    [135, 344],
  ];
  for (const [w, h] of sizes) {
    const sizeButton = createSizeItem();
    sizeButton.textContent = `${w}x${h}`;
    sizeButton.addEventListener("click", async () => {
      setCanvasSize(w, h);
      addUndo();
    });
  }

  const moveBox = document.createElement("div");
  moveBox.className = "rurucan-generated";
  moveBox.style.position = "absolute";
  moveBox.style.right = "-310px";
  moveBox.style.top = "0px";
  moveBox.style.width = "80px";
  moveBox.style.height = "100px";
  palette.appendChild(moveBox);

  function createMoveButton() {
    const moveItem = document.createElement("div");
    moveItem.style.width = "30px";
    moveItem.style.height = "20px";
    moveItem.style.border = "1px solid #800000";
    moveItem.style.boxSizing = "border-box";
    moveItem.style.fontSize = "12px";
    moveItem.style.fontWeight = "bold";
    moveItem.style.lineHeight = "12px";
    moveItem.style.backgroundColor = "#F0E0D6";
    moveBox.appendChild(moveItem);

    return moveItem;
  }

  {
    function move(x, y) {
      let context = canvas.getContext("2d");
      let w = canvas.width, h = canvas.height;
      let imageData = context.getImageData(0, 0, w, h);
      if (moveFast) {
        x *= 8;
        y *= 8;
      }
      context.putImageData(imageData, x, y);
    }

    let up = createMoveButton();
    up.textContent = "↑";
    up.addEventListener("click", () => move(0, -1));

    let down = createMoveButton();
    down.textContent = "↓";
    down.addEventListener("click", () => move(0, 1));

    let left = createMoveButton();
    left.textContent = "←";
    left.addEventListener("click", () => move(-1, 0));

    let right = createMoveButton();
    right.textContent = "→";
    right.addEventListener("click", () => move(1, 0));
  }

  {
    let fastLabel = document.createElement("label");
    fastLabel.style.display = "block";
    let fastCheck = document.createElement("input");
    fastCheck.type = "checkbox";
    fastLabel.appendChild(fastCheck);
    fastLabel.appendChild(document.createTextNode("fast"));
    moveBox.appendChild(fastLabel);
    fastCheck.addEventListener("click", () => {
      if (fastCheck.checked) {
        moveFast = true;
      } else {
        moveFast = false;
      }
    });
  }

  {
    let menuLabel = document.createElement("label");
    menuLabel.style.display = "block";
    let menuCheck = document.createElement("input");
    menuCheck.type = "checkbox";
    menuLabel.appendChild(menuCheck);
    menuLabel.appendChild(document.createTextNode("menu"));
    moveBox.appendChild(menuLabel);
    menuCheck.addEventListener("click", () => {
      if (menuCheck.checked) {
        disableMenu = false;
      } else {
        disableMenu = true;
      }
    });
  }

  let ver = document.createElement("div");
  ver.textContent = VERSION;
  ver.style.fontSize = "0.8em";
  ver.style.marginTop = "0.2em";
  moveBox.appendChild(ver);
}

function check() {
  const oeBox = document.getElementById("oe3");
  if (!oeBox) {
    return false;
  }
  const canvas = document.getElementById("oejs");
  if (!canvas) {
    return false;
  }
  const palette = document.getElementById("oest2");
  if (!palette) {
    return false;
  }
  const cBox = document.getElementById("oest1");
  if (!cBox) {
    return false;
  }
  const pli = document.getElementsByClassName("oepli");
  if (pli.length < 1) {
    return false;
  }
  const slider = document.getElementById("slider1");
  if (!slider) {
    return false;
  }
  const oest3 = document.getElementById("oest3");
  if (!oest3) {
    return false;
  }
  const sliderin = slider.getElementsByTagName("div");
  if (sliderin.length < 2) {
    return false;
  }
  const sliderout = document.getElementById("slider1o");
  if (!sliderout) {
    return false;
  }
  const oepb = document.getElementById("oepb");
  if (!oepb) {
    return false;
  }
  const ftxa = document.getElementById("ftxa");
  if (!ftxa) {
    return false;
  }
  const oebtnud = document.getElementById("oebtnud");
  if (!oebtnud) {
    return false;
  }
  const swfContents = document.getElementById("swfContents");
  if (!swfContents) {
    return false;
  }

  onCanvas(oeBox, canvas, palette, cBox, pli[0], slider, oest3,
           sliderin[1], sliderout,
           oepb, ftxa, oebtnud, swfContents);
  return true;
}

function onload() {
  if (check()) {
    return;
  }

  const button = document.getElementById("oebtnj");
  if (!button) {
    return;
  }

  button.addEventListener("click", async function() {
    if (check()) {
      return;
    }
    for (const t in [10, 20, 30, 40]) {
      await sleep(t);

      if (check()) {
        return;
      }
    }
  });
}

onload();
