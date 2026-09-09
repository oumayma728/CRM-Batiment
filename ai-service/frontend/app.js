const $ = (id) => document.getElementById(id);
const euro = (n) =>
  n == null || Number.isNaN(n)
    ? "—"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const state = {
  devis: null,
  photo: null,
  media: null,
  chunks: [],
  rec: null,
  timer: null,
  seconds: 0,
  catalogue: [],
};

let recalcTimer = null;

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || res.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

function description() {
  return $("description").value.trim();
}

$("description").addEventListener("input", () => {
  $("btn-generer").disabled = description().length < 3;
});

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

async function ping() {
  try {
    const h = await api("/health/db");
    $("health-badge").textContent = `Base OK · ${h.prestations_count} prestations`;
    $("health-badge").className = "badge ok";
  } catch (e) {
    $("health-badge").textContent = "Base injoignable";
    $("health-badge").className = "badge bad";
  }
}

function setLoading(on) {
  $("zone2-empty").classList.add("hidden");
  $("zone2-work").classList.remove("hidden");
  $("loading").classList.toggle("hidden", !on);
  if (on) $("occ-list").innerHTML = "";
}

function setBusy(on) {
  ["btn-generer", "btn-photo-devis", "btn-vocal-devis"].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = on || (id === "btn-generer" && description().length < 3);
  });
}

async function generer(text) {
  setBusy(true);
  setLoading(true);
  try {
    const data = await api("/api/devis/generer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: text,
        company_id: 1,
        client_id: 1,
        createur_id: 1,
      }),
    });
    applySession(data);
  } catch (e) {
    toast("Génération impossible : " + e.message, "bad");
    $("zone2-empty").classList.remove("hidden");
    $("zone2-work").classList.add("hidden");
  } finally {
    $("loading").classList.add("hidden");
    setBusy(false);
    $("btn-generer").disabled = description().length < 3;
  }
}

$("btn-generer").addEventListener("click", () => generer(description()));

function applySession(data) {
  state.devis = data;
  $("zone2-empty").classList.add("hidden");
  $("zone2-work").classList.remove("hidden");
  $("devis-ref").textContent = `#${data.devis_id}`;
  if (data.taux_marge != null) $("taux-marge").value = Math.round(data.taux_marge * 100);
  renderOccs();
  renderZone3();
}

function tauxMarge() {
  const pct = parseFloat($("taux-marge").value);
  return Number.isFinite(pct) ? pct / 100 : 0;
}

function quantitesPayload() {
  return (state.devis?.occurrences || []).map((o) => {
    const input = document.querySelector(`[data-qty="${o.uid}"]`);
    const raw = input ? input.value.trim() : "";
    return {
      uid: o.uid,
      quantite_ouvrage: raw === "" ? null : parseFloat(raw),
    };
  });
}

async function recalculer() {
  if (!state.devis) return;
  const data = await api(`/api/devis/${state.devis.devis_id}/recalculer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taux_marge: tauxMarge(),
      quantites: quantitesPayload(),
      remise_ht: state.devis.remise_ht || 0,
      remise_libelle: state.devis.remise_libelle || "Remise commerciale",
    }),
  });
  applySession(data);
}

function scheduleRecalc() {
  clearTimeout(recalcTimer);
  recalcTimer = setTimeout(() => recalculer().catch((e) => toast(e.message, "bad")), 280);
}

$("taux-marge").addEventListener("input", scheduleRecalc);

function renderOccs() {
  const list = $("occ-list");
  list.innerHTML = "";
  for (const occ of state.devis.occurrences) {
    const missing = occ.quantite_ouvrage == null;
    const card = document.createElement("article");
    card.className = "card" + (missing ? " missing" : "");
    const alerte = occ.alerte_fourchette;
    const borneMin = alerte?.borne_min ?? occ.prix_vente_min * (occ.quantite_ouvrage || 0);
    const borneMax = alerte?.borne_max ?? occ.prix_vente_max * (occ.quantite_ouvrage || 0);
    const alerteHtml = alerte
      ? `<div class="alert-band">⚠ Prix hors fourchette pour ${occ.quantite_ouvrage} ${escapeHtml(occ.unite || "")} (attendu ${euro(borneMin)}–${euro(borneMax)}) · écart ${euro(alerte.ecart)}</div>`
      : "";
    const missingHtml = missing
      ? `<div class="missing-band">Quantité d'ouvrage manquante — le devis ne peut pas être finalisé.</div>`
      : "";
    const opts = (occ.options_disponibles || [])
      .map(
        (nom) =>
          `<label><input type="checkbox" data-opt="${occ.uid}" value="${escapeHtml(nom)}" ${
            (occ.options_choisies || []).includes(nom) ? "checked" : ""
          } /> ${escapeHtml(nom)}</label>`
      )
      .join("");
    const comps = (occ.composants || [])
      .map((c) => {
        const zero = !occ.quantite_ouvrage;
        return `<div class="comp ${zero ? "zero" : ""}">
          <span>${escapeHtml(c.nom)}</span>
          <span>${c.quantite_calculee ?? 0} ${escapeHtml(c.unite || "")}</span>
          <span>${euro(c.prix_vente_unitaire)}</span>
          <span>${euro(c.total_ht)}</span>
        </div>`;
      })
      .join("");
    card.innerHTML = `
      <div class="card-head">
        <h3>${escapeHtml(occ.nom)}</h3>
        <div class="qty">
          <input data-qty="${occ.uid}" type="number" min="0" step="0.01" value="${
            occ.quantite_ouvrage ?? ""
          }" placeholder="Qté" />
          <span>${escapeHtml(occ.unite || "")}</span>
          <button class="btn danger" type="button" data-del="${occ.uid}">Supprimer</button>
        </div>
      </div>
      ${missingHtml}${alerteHtml}
      ${opts ? `<div class="options">${opts}</div>` : ""}
      <div class="comps">
        <div class="comp comp-head"><span>Composant</span><span>Quantité</span><span>Prix unitaire HT</span><span>Total HT</span></div>
        ${comps}
      </div>
      <div class="card-foot"><span>Sous-total prestation</span><span>${euro(occ.prix_vente_total)}</span></div>
    `;
    list.appendChild(card);
  }

  if ((state.devis.remise_ht || 0) > 0) {
    const remise = document.createElement("article");
    remise.className = "card remise-card";
    remise.innerHTML = `
      <div class="card-head">
        <h3>${escapeHtml(state.devis.remise_libelle || "Remise commerciale")}</h3>
        <button class="btn danger" type="button" data-del-remise>Supprimer</button>
      </div>
      <div class="card-foot"><span>Remise HT</span><span>−${euro(state.devis.remise_ht)}</span></div>`;
    list.appendChild(remise);
  }

  list.querySelectorAll("[data-qty]").forEach((el) => el.addEventListener("input", scheduleRecalc));
  list.querySelectorAll("[data-del]").forEach((el) =>
    el.addEventListener("click", async () => {
      try {
        await recalculer();
        const data = await api(
          `/api/devis/${state.devis.devis_id}/occurrences/${el.dataset.del}?taux_marge=${tauxMarge()}`,
          { method: "DELETE" }
        );
        applySession(data);
      } catch (e) {
        toast(e.message, "bad");
      }
    })
  );
  list.querySelectorAll("[data-opt]").forEach((el) =>
    el.addEventListener("change", async () => {
      const uid = el.dataset.opt;
      const options = [...list.querySelectorAll(`[data-opt="${uid}"]:checked`)].map((i) => i.value);
      try {
        const data = await api(`/api/devis/${state.devis.devis_id}/options`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            options,
            taux_marge: tauxMarge(),
            quantites: quantitesPayload(),
          }),
        });
        applySession(data);
      } catch (e) {
        toast(e.message, "bad");
      }
    })
  );
  list.querySelectorAll("[data-del-remise]").forEach((el) =>
    el.addEventListener("click", async () => {
      state.devis.remise_ht = 0;
      await recalculer().catch((e) => toast(e.message, "bad"));
    })
  );
}

function toast(msg, kind) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast " + (kind || "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 3500);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
}

function renderZone3() {
  const d = state.devis;
  const ready = Boolean(d);
  $("btn-save").disabled = !ready;
  $("t-ht").textContent = ready ? euro(d.total_ht) : "—";
  $("t-tva-rate").textContent = ready ? `(${d.tva_pourcent} %)` : "";
  $("t-tva").textContent = ready ? euro(d.total_tva) : "—";
  $("t-ttc").textContent = ready ? euro(d.total_ttc) : "—";
  const mp = d?.resultat_marge?.marge_pourcent;
  $("t-marque").textContent = ready ? `${mp} %` : "—";
  const box = $("marque-box");
  box.className = "marque";
  const alertes = d?.resultat_marge?.alertes || [];
  if (ready && alertes.length === 0 && (d.total_ht || 0) > 0) box.classList.add("ok");
  if (alertes.length) box.classList.add("bad");
  $("marque-msg").textContent = alertes.map((a) => a.message).join(" · ");
  $("btn-send").disabled = !ready || !d.peut_envoyer;
  $("send-hint").textContent = (d?.raisons_blocage || []).join(" · ");
  $("btn-send").title = $("send-hint").textContent;
}

$("btn-save").addEventListener("click", async () => {
  try {
    await recalculer();
    const data = await api(`/api/devis/${state.devis.devis_id}/enregistrer`, { method: "POST" });
    applySession(data);
    toast("Brouillon enregistré.", "ok");
  } catch (e) {
    toast(e.message, "bad");
  }
});

$("btn-send").addEventListener("click", () => {
  if (!state.devis) return;
  $("modal-send").showModal();
});

$("form-send").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await recalculer();
    const data = await api(`/api/devis/${state.devis.devis_id}/envoyer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_client: $("client-email").value.trim() }),
    });
    $("modal-send").close();
    toast(`Devis #${data.devis_id} envoyé à ${data.email_client}.`, "ok");
    state.devis = null;
    $("zone2-work").classList.add("hidden");
    $("zone2-empty").classList.remove("hidden");
    renderZone3();
  } catch (e) {
    toast(e.message, "bad");
  }
});
$("cancel-send").addEventListener("click", () => $("modal-send").close());

$("btn-preview").addEventListener("click", () => {
  if (!state.devis) return;
  const tva = state.devis.tva_pourcent || 20;
  $("preview-body").innerHTML = (state.devis.lignes_apercu || [])
    .map((l) => {
      const tvaAmt = (l.totalHT || 0) * tva / 100;
      return `<tr>
        <td>${escapeHtml(l.description)}</td>
        <td>${l.quantite} ${escapeHtml(l.unite)}</td>
        <td>${euro(l.prixUnitaireVente)}</td>
        <td>${tva} %</td>
        <td>${euro(tvaAmt)}</td>
        <td>${euro(l.totalHT)}</td>
      </tr>`;
    })
    .join("");
  $("preview-foot").innerHTML = `<span>TVA ${tva} %</span><strong>TTC ${euro(state.devis.total_ttc)}</strong>`;
  $("modal-preview").showModal();
});
$("close-preview").addEventListener("click", () => $("modal-preview").close());

$("btn-add").addEventListener("click", async () => {
  if (!state.catalogue.length) {
    const c = await api("/api/catalogue");
    state.catalogue = c.prestations;
  }
  $("select-prestation").innerHTML = state.catalogue
    .map((p) => `<option value="${p.id}">${escapeHtml(p.nom)} (${escapeHtml(p.unite)})</option>`)
    .join("");
  $("modal-add").showModal();
});
$("confirm-add").addEventListener("click", async () => {
  const id = parseInt($("select-prestation").value, 10);
  try {
    const data = await api(`/api/devis/${state.devis.devis_id}/ajouter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prestation_id: id,
        taux_marge: tauxMarge(),
        quantites: quantitesPayload(),
      }),
    });
    applySession(data);
    $("modal-add").close();
  } catch (e) {
    toast(e.message, "bad");
  }
});

$("btn-add-remise").addEventListener("click", () => {
  if (!state.devis) return;
  $("remise-libelle").value = state.devis.remise_libelle || "Remise commerciale";
  $("remise-montant").value = state.devis.remise_ht || "";
  $("modal-remise").showModal();
});
$("form-remise").addEventListener("submit", async (event) => {
  event.preventDefault();
  const montant = parseFloat($("remise-montant").value);
  if (!Number.isFinite(montant) || montant < 0) {
    toast("Saisissez un montant de remise HT valide.", "bad");
    return;
  }
  state.devis.remise_ht = montant;
  state.devis.remise_libelle = $("remise-libelle").value.trim() || "Remise commerciale";
  try {
    await recalculer();
    $("modal-remise").close();
  } catch (e) {
    toast(e.message, "bad");
  }
});
$("cancel-remise").addEventListener("click", () => $("modal-remise").close());

/* Photo */
const drop = $("dropzone");
drop.addEventListener("click", () => $("photo-input").click());
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("drag");
});
drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("drag");
  if (e.dataTransfer.files[0]) handlePhoto(e.dataTransfer.files[0]);
});
$("photo-input").addEventListener("change", (e) => {
  if (e.target.files[0]) handlePhoto(e.target.files[0]);
});

function handlePhoto(file) {
  $("photo-error").classList.add("hidden");
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    $("photo-error").textContent = "Formats acceptés : JPEG ou PNG.";
    $("photo-error").classList.remove("hidden");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    $("photo-error").textContent = "Fichier trop volumineux (10 Mo max).";
    $("photo-error").classList.remove("hidden");
    return;
  }
  const url = URL.createObjectURL(file);
  $("photo-preview").src = url;
  $("photo-preview").classList.remove("hidden");
  $("btn-photo-devis").classList.add("hidden");
  $("photo-analysis").classList.add("hidden");
  const fd = new FormData();
  fd.append("file", file);
  $("photo-analysis").classList.remove("hidden");
  $("photo-analysis").innerHTML = "<span class='hint'>Analyse en cours…</span>";
  api("/api/photo/analyser", { method: "POST", body: fd })
    .then((a) => {
      state.photo = a;
      const warn = a.confidence_surface != null && a.confidence_surface < 0.7;
      $("photo-analysis").innerHTML = `
        <span class="chip">${escapeHtml(a.type_piece || "pièce ?")}</span>
        <span class="chip ${warn ? "warn" : ""}">Surface ~ ${a.surface_estimee_m2 ?? "?"} m² ${
          warn ? "⚠" : ""
        }</span>
        ${(a.materiaux_identifies || []).map((m) => `<span class="chip">${escapeHtml(m)}</span>`).join("")}
      `;
      $("btn-photo-devis").classList.remove("hidden");
    })
    .catch((e) => {
      $("photo-analysis").innerHTML = "";
      $("photo-error").textContent = e.message;
      $("photo-error").classList.remove("hidden");
    });
}

$("btn-photo-devis").addEventListener("click", () => {
  const a = state.photo;
  if (!a) return;
  const mats = (a.materiaux_identifies || []).join(", ");
  const text = `Photo de chantier : ${a.type_piece || "pièce"}, surface estimée ${
    a.surface_estimee_m2 ?? "?"
  } m². Matériaux identifiés : ${mats || "non identifiés"}.`;
  $("description").value = text;
  $("btn-generer").disabled = false;
  generer(text);
});

/* Vocal */
function fmtTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

$("btn-rec").addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.chunks = [];
  state.rec = new MediaRecorder(stream);
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);
  const dataArr = new Uint8Array(analyser.frequencyBinCount);
  const loop = () => {
    if (!state.rec || state.rec.state !== "recording") return;
    analyser.getByteFrequencyData(dataArr);
    const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
    $("vu").style.width = Math.min(100, (avg / 80) * 100) + "%";
    requestAnimationFrame(loop);
  };
  state.rec.ondataavailable = (e) => {
    if (e.data.size) state.chunks.push(e.data);
  };
  state.rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    ctx.close();
    $("vu").style.width = "0";
    const blob = new Blob(state.chunks, { type: state.rec.mimeType || "audio/webm" });
    state.media = blob;
    $("btn-replay").disabled = false;
    sendTranscription(blob);
  };
  state.rec.start();
  state.seconds = 0;
  $("chrono").textContent = "00:00";
  $("btn-rec").disabled = true;
  $("btn-stop").disabled = false;
  loop();
  state.timer = setInterval(() => {
    state.seconds += 1;
    $("chrono").textContent = fmtTime(state.seconds);
    if (state.seconds >= 60) $("btn-stop").click();
  }, 1000);
});

$("btn-stop").addEventListener("click", () => {
  clearInterval(state.timer);
  $("btn-rec").disabled = false;
  $("btn-stop").disabled = true;
  if (state.rec && state.rec.state === "recording") state.rec.stop();
});

$("btn-replay").addEventListener("click", () => {
  if (!state.media) return;
  new Audio(URL.createObjectURL(state.media)).play();
});

async function sendTranscription(blob) {
  const fd = new FormData();
  fd.append("file", blob, "audio.webm");
  $("transcription").value = "Transcription en cours…";
  try {
    const t = await api("/api/vocal/transcrire", { method: "POST", body: fd });
    $("transcription").value = t.transcription_texte || "";
    $("btn-vocal-devis").disabled = $("transcription").value.trim().length < 3;
    const badge = $("confidence-badge");
    badge.classList.remove("hidden", "ok", "warn", "bad");
    const c = t.confidence_score;
    if (c == null) {
      badge.textContent = "score Whisper non fourni";
    } else {
      badge.textContent = `confiance ${(c * 100).toFixed(0)} %`;
      badge.classList.add(c < 0.7 ? "bad" : c < 0.85 ? "warn" : "ok");
    }
  } catch (e) {
    $("transcription").value = "";
    toast(e.message, "bad");
  }
}

$("transcription").addEventListener("input", () => {
  $("btn-vocal-devis").disabled = $("transcription").value.trim().length < 3;
});
$("btn-vocal-devis").addEventListener("click", () => {
  const text = $("transcription").value.trim();
  $("description").value = text;
  generer(text);
});

ping();
renderZone3();
