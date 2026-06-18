/* ============================================================
   1. Drammen Speidergruppe – admin-verktøy
   Program- og turnusbygger. Vanilla JS, ingen avhengigheter.

   Datamodell (én kilde til sannhet):
     state = {
       title:      string,                 // redigerbar overskrift -> "# title"
       cols:       string[],               // header-rad (cols[0] = hjørne/label-tittel)
       rows:       string[][],             // body; rows[i][0] = rad-etikett (label-kolonne)
       boldLabels: boolean                 // fet venstre kolonne i markdown
     }

   De rene funksjonene (serializeMarkdown / parseMarkdown / distributePaste)
   eksporteres nederst slik at de kan enhetstestes i Node uten DOM.
   ============================================================ */

(function () {
  "use strict";

  // ---------------------------------------------------------------
  // RENE FUNKSJONER (ingen DOM)
  // ---------------------------------------------------------------

  function escapeCell(value) {
    return String(value == null ? "" : value)
      .replace(/\|/g, "\\|")
      .replace(/\r?\n/g, " ");
  }

  // state -> markdown-dokument (header-rad + label-kolonne)
  function serializeMarkdown(state) {
    var out = "";
    var title = (state.title || "").trim();
    if (title) out += "# " + title + "\n\n";

    var header = state.cols.map(escapeCell);
    out += "| " + header.join(" | ") + " |\n";
    out += "| " + state.cols.map(function () { return "---"; }).join(" | ") + " |\n";

    state.rows.forEach(function (row) {
      var cells = row.map(function (val, c) {
        var t = escapeCell(val);
        if (state.boldLabels && c === 0 && t.trim() !== "") t = "**" + t + "**";
        return t;
      });
      out += "| " + cells.join(" | ") + " |\n";
    });
    return out;
  }

  // del en tabell-linje på ikke-escapede pipes
  function splitTableRow(line) {
    var s = line.trim().replace(/^\|/, "").replace(/\|\s*$/, "");
    var cells = [];
    var cur = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === "\\" && s[i + 1] === "|") { cur += "|"; i++; }
      else if (ch === "|") { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return cells.map(function (c) {
      return c
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/^\s*\*\*([\s\S]*)\*\*\s*$/, "$1")
        .trim();
    });
  }

  function isSeparatorRow(line) {
    var t = line.trim();
    if (t.indexOf("-") === -1) return false;
    return /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/.test(t);
  }

  // markdown -> state (tolerant). Returnerer null hvis ingen tabell finnes.
  function parseMarkdown(text) {
    var lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    var title = "";
    var tableRows = [];
    var inTable = false;

    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();

      if (t === "") {
        if (inTable) break;       // blank linje avslutter tabellen
        continue;
      }
      if (!inTable && !title && /^#{1,6}\s+/.test(t)) {
        title = t.replace(/^#{1,6}\s+/, "").trim();
        continue;
      }
      if (t.indexOf("|") !== -1) {
        if (isSeparatorRow(t)) { inTable = true; continue; }  // hopp over separatoren
        tableRows.push(splitTableRow(t));
        inTable = true;
        continue;
      }
      if (inTable) break;          // ikke-tabell-linje etter tabellen
    }

    if (tableRows.length === 0) return null;

    var cols = tableRows.shift();
    var width = cols.length;
    var rows = tableRows.map(function (r) {
      var row = r.slice(0, width);
      while (row.length < width) row.push("");
      return row;
    });

    return { title: title, cols: cols, rows: rows, boldLabels: false };
  }

  // Fordel linjer ut i ledige (tomme) celler, rad for rad. Muterer og
  // returnerer state. Legger til nye rader når det er tomt for plass.
  function distributePaste(state, lines, includeLabel) {
    var startC = includeLabel ? 0 : 1;
    var width = state.cols.length;
    if (startC >= width) return state;   // ingen kolonner å fylle

    var li = 0;

    // 1) fyll eksisterende tomme celler
    for (var r = 0; r < state.rows.length && li < lines.length; r++) {
      for (var c = startC; c < width && li < lines.length; c++) {
        if (String(state.rows[r][c]).trim() === "") {
          state.rows[r][c] = lines[li++];
        }
      }
    }
    // 2) overflyt -> nye rader
    while (li < lines.length) {
      var row = new Array(width).fill("");
      for (var c2 = startC; c2 < width && li < lines.length; c2++) {
        row[c2] = lines[li++];
      }
      state.rows.push(row);
    }
    return state;
  }

  // ---------------------------------------------------------------
  // NODE-EKSPORT (for enhetstest) – ingen DOM under
  // ---------------------------------------------------------------
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { serializeMarkdown: serializeMarkdown, parseMarkdown: parseMarkdown, distributePaste: distributePaste };
  }
  if (typeof document === "undefined") return;

  // ---------------------------------------------------------------
  // APP (DOM)
  // ---------------------------------------------------------------

  var STORAGE_KEY = "1drm-admin-doc-v1";

  function emptyRow(width) { return new Array(width).fill(""); }

  function templateProgram() {
    return {
      title: "Program",
      cols: ["Tid", "Aktivitet", "Ansvarlig"],
      rows: [
        ["17:30", "", ""],
        ["17:45", "", ""],
        ["18:00", "", ""],
        ["18:30", "", ""],
        ["18:45", "", ""],
      ],
      boldLabels: false,
    };
  }

  function templateTurnus() {
    return {
      title: "Turnus",
      cols: ["Patrulje", "Fredag", "Lørdag", "Søndag"],
      rows: [
        ["Gaupe", "", "", ""],
        ["Bever", "", "", ""],
        ["Bjørn", "", "", ""],
        ["Ulv", "", "", ""],
        ["Rev", "", "", ""],
      ],
      boldLabels: false,
    };
  }

  // --- state ---
  var state = load() || templateProgram();

  // --- DOM-referanser ---
  var $ = function (id) { return document.getElementById(id); };
  var tableWrap = $("tableWrap");
  var docTitle = $("docTitle");
  var markdownBox = $("markdownBox");
  var pasteBox = $("pasteBox");
  var saveStatus = $("saveStatus");
  var boldLabelsBox = $("boldLabels");
  var pasteIncludeLabel = $("pasteIncludeLabel");

  // --- lagring ---
  var saveTimer = null;
  function scheduleSave() {
    if (saveStatus) saveStatus.textContent = "Lagrer…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        if (saveStatus) saveStatus.textContent = "Lagret \u2713";
      } catch (e) {
        if (saveStatus) saveStatus.textContent = "";
      }
    }, 400);
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.cols) || !Array.isArray(s.rows)) return null;
      if (typeof s.title !== "string") s.title = "";
      if (typeof s.boldLabels !== "boolean") s.boldLabels = false;
      return s;
    } catch (e) { return null; }
  }

  // --- markdown-utdata ---
  function refreshMarkdown() { markdownBox.value = serializeMarkdown(state); }

  // --- adressehjelpere (data-addr: "col:c" eller "body:r:c") ---
  function getVal(addr) {
    var p = addr.split(":");
    return p[0] === "col" ? state.cols[+p[1]] : state.rows[+p[1]][+p[2]];
  }
  function setVal(addr, v) {
    var p = addr.split(":");
    if (p[0] === "col") state.cols[+p[1]] = v;
    else state.rows[+p[1]][+p[2]] = v;
  }

  // --- render ---
  function cellHtml(addr, value, placeholder) {
    var ph = placeholder ? ' data-placeholder="' + placeholder + '"' : "";
    return (
      '<span class="grip" title="Dra for å bytte celle">\u283F</span>' +
      '<span class="cell" contenteditable="true" spellcheck="false" data-addr="' +
      addr + '"' + ph + ">" + escapeHtml(value) + "</span>"
    );
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function render() {
    docTitle.textContent = state.title || "";
    if (boldLabelsBox) boldLabelsBox.checked = !!state.boldLabels;

    var width = state.cols.length;
    var html = '<table class="grid"><thead><tr>';
    state.cols.forEach(function (val, c) {
      var ph = c === 0 ? "Tittel" : "Kolonne";
      html += "<th>" + cellHtml("col:" + c, val, ph) + "</th>";
    });
    html += "</tr></thead><tbody>";

    state.rows.forEach(function (row, r) {
      html += "<tr>";
      for (var c = 0; c < width; c++) {
        var tag = c === 0 ? "th" : "td";
        var ph = c === 0 ? "Etikett" : "";
        html += "<" + tag + ' scope="' + (c === 0 ? "row" : "col") + '">' +
          cellHtml("body:" + r + ":" + c, row[c], ph) + "</" + tag + ">";
      }
      html += "</tr>";
    });
    html += "</tbody></table>";
    tableWrap.innerHTML = html;

    refreshMarkdown();
  }

  function commit() { scheduleSave(); refreshMarkdown(); }

  // --- celleredigering (event-delegasjon) ---
  tableWrap.addEventListener("input", function (e) {
    var cell = e.target.closest(".cell[data-addr]");
    if (!cell) return;
    setVal(cell.dataset.addr, cell.textContent);
    commit();
  });
  // hold celler enlinjet og lim inn som ren tekst
  tableWrap.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var cell = e.target.closest(".cell[data-addr]");
      if (cell) { e.preventDefault(); cell.blur(); }
    }
  });
  tableWrap.addEventListener("paste", function (e) {
    var cell = e.target.closest(".cell[data-addr]");
    if (!cell) return;
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData("text").replace(/\r?\n/g, " ");
    document.execCommand("insertText", false, text);
  });

  // --- overskrift ---
  docTitle.addEventListener("input", function () {
    state.title = docTitle.textContent.replace(/\r?\n/g, " ").trim();
    commit();
  });
  docTitle.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); docTitle.blur(); }
  });

  // --- drag & drop (bytt celler) – pointer events, mus + touch ---
  var drag = null;
  tableWrap.addEventListener("pointerdown", function (e) {
    var grip = e.target.closest(".grip");
    if (!grip) return;
    var cellEl = grip.parentNode.querySelector(".cell[data-addr]");
    if (!cellEl) return;
    e.preventDefault();

    drag = { from: cellEl.dataset.addr, fromEl: cellEl, target: null, ghost: null };
    cellEl.classList.add("cell-dragging");

    var ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.textContent = cellEl.textContent || "(tom)";
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    moveGhost(e);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  });

  function moveGhost(e) {
    if (!drag || !drag.ghost) return;
    drag.ghost.style.left = e.clientX + 12 + "px";
    drag.ghost.style.top = e.clientY + 12 + "px";
  }

  function onMove(e) {
    if (!drag) return;
    moveGhost(e);
    drag.ghost.style.display = "none";
    var el = document.elementFromPoint(e.clientX, e.clientY);
    drag.ghost.style.display = "";
    var cell = el && el.closest ? el.closest(".cell[data-addr]") : null;
    if (drag.target && drag.target !== cell) drag.target.classList.remove("drop-target");
    if (cell && cell !== drag.fromEl) cell.classList.add("drop-target");
    drag.target = cell;
  }

  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (!drag) return;
    var target = drag.target;
    if (drag.ghost) drag.ghost.remove();
    if (drag.fromEl) drag.fromEl.classList.remove("cell-dragging");
    if (target) target.classList.remove("drop-target");

    if (target && target.dataset.addr !== drag.from) {
      var a = drag.from, b = target.dataset.addr;
      var va = getVal(a), vb = getVal(b);
      setVal(a, vb); setVal(b, va);
      commit();
      render();
    }
    drag = null;
  }

  // --- verktøylinje ---
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var act = btn.dataset.act;
    var width = state.cols.length;

    switch (act) {
      case "template-program": state = templateProgram(); break;
      case "template-turnus": state = templateTurnus(); break;
      case "row-add": state.rows.push(emptyRow(width)); break;
      case "row-del": if (state.rows.length > 1) state.rows.pop(); break;
      case "col-add":
        state.cols.push("");
        state.rows.forEach(function (r) { r.push(""); });
        break;
      case "col-del":
        if (state.cols.length > 1) {
          state.cols.pop();
          state.rows.forEach(function (r) { r.pop(); });
        }
        break;
      case "clear":
        state.rows.forEach(function (r) {
          for (var c = 1; c < r.length; c++) r[c] = "";  // behold etiketter
        });
        break;
      case "reset":
        if (!confirm("Nullstille til en tom program-mal? Dette sletter det lagrede arbeidet.")) return;
        try { localStorage.removeItem(STORAGE_KEY); } catch (e2) {}
        state = templateProgram();
        break;
      case "print": window.print(); return;
      case "paste-fill": doPasteFill(); return;
      case "paste-clear": pasteBox.value = ""; return;
      case "md-copy": copyMarkdown(); return;
      case "md-download": downloadMarkdown(); return;
      case "md-import": doImport(); return;
      default: return;
    }
    commit();
    render();
  });

  // --- paste-fordeling ---
  function doPasteFill() {
    var lines = pasteBox.value.split(/\r?\n/).map(function (l) { return l.trim(); })
      .filter(function (l) { return l !== ""; });
    if (!lines.length) { toast("Ingen linjer å fylle inn"); return; }
    distributePaste(state, lines, pasteIncludeLabel && pasteIncludeLabel.checked);
    commit();
    render();
    toast(lines.length + " linjer fylt inn");
  }

  // --- import / eksport ---
  function doImport() {
    var parsed = parseMarkdown(markdownBox.value);
    if (!parsed) { toast("Fant ingen markdown-tabell"); return; }
    parsed.boldLabels = !!(boldLabelsBox && boldLabelsBox.checked);
    state = parsed;
    commit();
    render();
    toast("Importert");
  }

  function copyMarkdown() {
    var text = serializeMarkdown(state);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Kopiert"); },
        function () { fallbackCopy(text); });
    } else { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    markdownBox.focus(); markdownBox.select();
    try { document.execCommand("copy"); toast("Kopiert"); }
    catch (e) { toast("Kunne ikke kopiere"); }
  }

  function slugify(s) {
    return (s || "tabell").toLowerCase()
      .replace(/[æå]/g, "a").replace(/ø/g, "o")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tabell";
  }
  function downloadMarkdown() {
    var blob = new Blob([serializeMarkdown(state)], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = slugify(state.title) + ".md";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // --- filåpning ---
  var fileInput = $("fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        markdownBox.value = String(reader.result);
        doImport();
      };
      reader.readAsText(file);
      fileInput.value = "";
    });
  }

  // --- fet venstre kolonne ---
  if (boldLabelsBox) {
    boldLabelsBox.addEventListener("change", function () {
      state.boldLabels = boldLabelsBox.checked;
      commit();
    });
  }

  // --- toast ---
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  // --- start ---
  render();
})();
