// Recovered from the production golf-pin.js application to preserve deployed purchases and PIN access.
import { createClient as Zi } from "@supabase/supabase-js";
async function ta() {
  const r = (b) => document.getElementById(b), e = window.GOLF_CONFIG;
  if (!e?.url || !e?.publishableKey || e.url.includes("YOUR_PROJECT") || e.publishableKey.includes("YOUR_KEY")) {
    r("status").textContent = "Setup needed: configure the Supabase project URL and publishable key.";
    return;
  }
  const t = Zi(e.url, e.publishableKey, { auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, flowType: "implicit" } });
  let s = [], n = [], i = null, a = null, o = 0, l = Promise.resolve();
  const c = /* @__PURE__ */ new Set(), u = (b) => String(b ?? "").replace(/[&<>"']/g, (S) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[S]), h = (b) => n.find((S) => S.id === b.team_id), f = (b) => h(b)?.name || "Unassigned", d = (b) => {
    r("status").textContent = b;
  }, p = () => g().catch((b) => d("Refresh failed: " + b.message));
  async function g() {
    if (!a) return;
    const b = ++o, S = a.id, [T, O] = await Promise.all([t.from("golf_teams").select("id,name,supreme_purchased,supreme_purchased_at").order("id"), t.from("golf_players").select("id,name,team_id,checked_in,checked_in_at,mulligan_purchased,mulligan_purchased_at,putting_purchased,putting_purchased_at,solo_purchased,solo_purchased_at").order("name")]);
    if (!(b !== o || a?.id !== S)) {
      if (T.error || O.error) throw T.error || O.error;
      n = T.data.filter(team => team.id !== 4), s = O.data.filter(player => player.team_id !== 4), d(s.length ? "Connected \xB7 Attendance and purchases synchronized" : "No roster is visible. Ask the organizer to approve your volunteer account."), v();
    }
  }
  async function addRosterSlot(teamId) {
    const team = n.find(x => x.id === teamId);
    if (!a || !team || c.has("add-roster")) return;
    c.add("add-roster"); d("Adding TBD golfer to " + team.name + "…");
    try {
      const { error } = await t.from("golf_players").insert({team_id:teamId,name:"TBD"});
      if (error) throw error;
      await g();
      d("Added TBD to " + team.name + ". Tap Edit when you have the golfer's name.");
    } catch(error) { d("Unable to add golfer: " + error.message); }
    finally { c.delete("add-roster"); v(); }
  }
  async function addRosterTeam() {
    if (!a || c.has("add-roster")) return;
    const entered = window.prompt("New team name:");
    if (entered === null) return;
    const name = entered.trim();
    if (!name || name.length > 120) { d("Enter a team name between 1 and 120 characters."); return; }
    if (!window.confirm("Add team " + name + " with four TBD golfer slots?")) return;
    c.add("add-roster"); d("Creating " + name + "…");
    try {
      const {data,error} = await t.from("golf_teams").insert({name}).select("id,name").single();
      if (error) throw error;
      const {error:playerError} = await t.from("golf_players").insert(
        Array.from({length:4},()=>({team_id:data.id,name:"TBD"}))
      );
      if (playerError) throw new Error("Team created but TBD slots could not be added: " + playerError.message);
      await g();
      d("Created " + name + " with four TBD slots. Edit names to include golfers in totals.");
    } catch(error) { await g().catch(()=>{}); d("Unable to add team: " + error.message); }
    finally { c.delete("add-roster"); v(); }
  }
  function y(b) {
    const S = h(b), T = !!S?.supreme_purchased, solo = !!b.solo_purchased, included = T || solo, O = c.has("mulligan:" + b.id), j = c.has("putting:" + b.id), soloSaving = c.has("solo:" + b.id), B = c.has("supreme:" + S?.id);
    return `<div class="person">
      <div class="person-main"><div><div class="name">${u(b.name)} <button type="button" class="edit-name-btn" data-edit-name="${b.id}" aria-label="Edit name for ${u(b.name)}" ${c.has("name:" + b.id) ? "disabled" : ""}>Edit</button></div>
      <div class="small muted">${u(f(b))}${b.checked_in ? " \xB7 Arrived" : ""}</div></div>
      <button data-check="${b.id}" ${b.name.trim().toUpperCase() === "TBD" || c.has("attendance:" + b.id) || c.has("team-attendance:" + b.team_id) ? "disabled" : ""} class="${b.checked_in ? "" : "green"}" aria-label="${b.checked_in ? "Undo check-in for" : "Check in"} ${u(b.name)}">${b.checked_in ? "Undo" : "\u2713 Check In"}</button></div>
      <div class="purchases">
      <label class="purchase-option ${included ? "included" : ""}"><input type="checkbox" data-mulligan="${b.id}" aria-label="Mulligan $10 for ${u(b.name)}" ${b.mulligan_purchased || included ? "checked" : ""} ${included || O || soloSaving ? "disabled" : ""}><span>${included ? "Mulligan $10 \xB7 included in " + (T ? "Supreme" : "Solo") : "Mulligan $10"}</span></label>
      <label class="purchase-option ${included ? "included" : ""}"><input type="checkbox" data-putting="${b.id}" aria-label="Putting Contest $5 for ${u(b.name)}" ${b.putting_purchased || included ? "checked" : ""} ${included || j || soloSaving ? "disabled" : ""}><span>${included ? "Putting Contest $5 \xB7 included in " + (T ? "Supreme" : "Solo") : "Putting Contest $5"}</span></label>
      <label class="purchase-option ${solo ? "included" : ""}"><input type="checkbox" data-solo="${b.id}" aria-label="Solo Package $20 for ${u(b.name)}" ${solo ? "checked" : ""} ${soloSaving || O || j ? "disabled" : ""}><span>Solo Package $20<span style="display:block;font-size:11px;font-weight:400;margin-top:3px">2 raffle tickets</span></span></label>
      </div></div>`;
  }
  function v() {
    const activePlayers = s.filter(x => x.name.trim().toUpperCase() !== "TBD");
    const b = activePlayers.length, S = activePlayers.filter((x) => x.checked_in).length;
    r("total").textContent = b, r("arrived").textContent = S, r("missing").textContent = b - S, r("bar").style.width = (b ? 100 * S / b : 0) + "%";
    const query = r("search").value.trim().toLowerCase();
    const attendance = r("filter").value;
    const matchingTeamIds = new Set(query ? s.filter(player => player.name.toLowerCase().includes(query)).map(player => player.team_id) : []);
    const matches = player => !query || matchingTeamIds.has(player.team_id) || f(player).toLowerCase().includes(query);
    const visible = s.filter(player => matches(player) &&
      (attendance === "all" || (attendance === "arrived" ? player.checked_in : !player.checked_in)));
    const visibleTeams = n.filter(team => !query || team.name.toLowerCase().includes(query) || matchingTeamIds.has(team.id));
    // Team actions always affect the whole team, regardless of search or attendance filters.
    r("list").innerHTML = `<div class="flex" style="margin-bottom:12px"><button type="button" data-add-team>Add New Team (4 TBD)</button><button type="button" data-add-individual>Add Individual (TBD)</button></div>` + visibleTeams.map(team => {
      const members = visible.filter(player => player.team_id === team.id);
      return members.length ? `<section class="team"><div class="flex space"><strong>${u(team.name)}</strong>${supremeButton(team)}${teamButton(team)}</div>${members.map(y).join("")}</section>` : "";
    }).join("") + visible.filter(player => !h(player)).map(y).join("") || '<p class="muted">No matching golfers.</p>';
    const B = new Set([...r("teamList").querySelectorAll("details[open]")].map((x) => x.dataset.team));
    r("teamList").innerHTML = `<div class="flex" style="margin-bottom:12px"><button type="button" data-add-team>Add New Team (4 TBD)</button><button type="button" data-add-individual>Add Individual (TBD)</button></div>` + visibleTeams.map((x) => {
      const ne = s.filter((he) => he.team_id === x.id);
      return `<details class="team" data-team="${x.id}" ${B.has(String(x.id)) ? "open" : ""}><summary>${u(x.name)} \u2014 ${ne.filter((he) => he.checked_in && he.name.trim().toUpperCase() !== "TBD").length}/${ne.filter((he) => he.name.trim().toUpperCase() !== "TBD").length} arrived${x.supreme_purchased ? " \xB7 Supreme purchased" : ""}</summary><div class="flex space" style="margin-top:10px">${supremeButton(x)}${teamButton(x)}</div>${ne.map(y).join("")}</details>`;
    }).join("") || '<p class="muted">No matching teams.</p>';
  }
  function supremeButton(team) {
    const purchased = !!team.supreme_purchased;
    const saving = c.has("supreme:" + team.id);
    return `<button type="button" data-supreme-team="${team.id}" class="${purchased ? "" : "green"}" ${saving ? "disabled" : ""}>${saving ? "Saving…" : purchased ? "Undo Supreme Team $80" : "Supreme Team $80"}<span style="display:block;font-size:11px;font-weight:400;margin-top:3px">8 raffle tickets</span></button>`;
  }
  function teamButton(team) {
    const members = s.filter(player => player.team_id === team.id && player.name.trim().toUpperCase() !== "TBD");
    const saving = c.has("team-attendance:" + team.id);
    const pending = members.some(player => c.has("attendance:" + player.id));
    const complete = members.length > 0 && members.every(player => player.checked_in);
    return `<button class="${complete ? "" : "green"}" data-check-team="${team.id}" aria-label="${complete ? "Undo Check In All" : "Check In All"} for ${u(team.name)}" ${saving || pending || !members.length ? "disabled" : ""}>${saving ? "Saving…" : complete ? "Undo Check In All" : "Check In All"}</button>`;
  }
  async function checkInTeam(teamId) {
    const team = n.find(team => team.id === teamId);
    const members = s.filter(player => player.team_id === teamId && player.name.trim().toUpperCase() !== "TBD");
    const key = "team-attendance:" + teamId;
    const undo = members.length > 0 && members.every(player => player.checked_in);
    if (!a || !team || !members.length || c.has(key) ||
        members.some(player => c.has("attendance:" + player.id))) return;
    c.add(key);
    v();
    d((undo ? "Undoing check-in for " : "Checking in ") + team.name + "…");
    try {
      // Only update attendance fields; retain purchases and package selections.
      const update = { checked_in: !undo, checked_in_at: undo ? null : new Date().toISOString() };
      const { data, error } = await t.from("golf_players")
        .update(update).eq("team_id", teamId).neq("name", "TBD").eq("checked_in", undo).select("id");
      if (error) throw error;
      await g();
      const updated = s.filter(player => player.team_id === teamId && player.name.trim().toUpperCase() !== "TBD");
      const successful = updated.every(player => player.checked_in === !undo);
      d(successful ? `${team.name}: ${undo ? "team check-in undone" : "all checked in"} (${data?.length || 0} updated).` :
        "Some golfers could not be updated. Refresh and check volunteer access.");
    } catch (error) {
      d("Unable to update team check-in: " + error.message);
    } finally {
      c.delete(key);
      v();
    }
  }
  async function k(b, S, T, O, j, B, x) {
    if (!(!a || !S || c.has(B))) {
      c.add(B), v(), d("Saving " + x + "\u2026");
      try {
        const { data: ne, error: he } = await t.from(b).update({ [T]: O, [j]: O ? (/* @__PURE__ */ new Date()).toISOString() : null }).eq("id", S.id).eq(T, S[T]).select("id");
        if (he) throw he;
        await g(), ne?.length ? d("Saved " + x + ".") : d("This record changed on another device, or your account cannot update it. Check the latest status and try again.");
      } catch (ne) {
        d("Unable to save " + x + ": " + ne.message);
      } finally {
        c.delete(B), v();
      }
    }
  }
  async function editGolferName(id) {
    const player = s.find(x => x.id === id);
    const key = "name:" + id;
    if (!a || !player || c.has(key)) return;
    const entered = window.prompt("Edit golfer name:", player.name);
    if (entered === null) return;
    const newName = entered.trim().replace(/\\s+/g, " ");
    if (!newName || newName.length > 120) {
      d("Enter a golfer name between 1 and 120 characters.");
      return;
    }
    if (newName === player.name) return;
    c.add(key);
    v();
    d("Saving golfer name…");
    try {
      const { data, error } = await t.from("golf_players").update({ name: newName })
        .eq("id", player.id).eq("name", player.name).select("id,name");
      if (error) throw error;
      if (!data?.length) throw new Error("Name was changed elsewhere or volunteer access does not allow editing.");
      await g();
      d("Golfer name updated to " + newName + ".");
    } catch (error) {
      d("Unable to edit golfer name: " + error.message);
    } finally {
      c.delete(key);
      v();
    }
  }
  document.addEventListener("click", (b) => {
    if (b.target.closest("[data-add-team]")) { addRosterTeam(); return; }
    if (b.target.closest("[data-add-individual]")) {
      const options = n.map(team => team.id + ": " + team.name).join("\\n");
      const selected = window.prompt("Enter the team number for the new TBD golfer:\\n" + options);
      if (selected === null) return;
      const teamId = Number(selected.trim());
      if (!n.some(team => team.id === teamId)) { d("Team not found. Use a team number from the list."); return; }
      addRosterSlot(teamId); return;
    }

    const editAction = b.target.closest("[data-edit-name]");
    if (editAction) { editGolferName(Number(editAction.dataset.editName)); return; }
    const S = b.target.closest("[data-check]");
    if (S) {
      const O = s.find((j) => j.id === Number(S.dataset.check));
      O && O.name.trim().toUpperCase() !== "TBD" && !c.has("team-attendance:" + O.team_id) && k("golf_players", O, "checked_in", !O.checked_in, "checked_in_at", "attendance:" + O.id, "check-in");
    }
    const supremeAction = b.target.closest("[data-supreme-team]");
    if (supremeAction && !supremeAction.disabled) {
      const team = n.find(x => x.id === Number(supremeAction.dataset.supremeTeam));
      if (team) k("golf_teams", team, "supreme_purchased", !team.supreme_purchased, "supreme_purchased_at", "supreme:" + team.id, "Supreme Team $80 for " + team.name);
    }
    const teamAction = b.target.closest("[data-check-team]");
    if (teamAction && !teamAction.disabled) checkInTeam(Number(teamAction.dataset.checkTeam));
    const T = b.target.closest("[data-tab]");
    T && (document.querySelectorAll("[data-tab]").forEach((O) => O.classList.toggle("selected", O === T)), ["check", "teams", "report"].forEach((O) => r(O).classList.toggle("hide", O !== T.dataset.tab)));
  }), document.addEventListener("change", (b) => {
    const S = b.target;
    if (S.matches("[data-mulligan]")) {
      const T = s.find((O) => O.id === Number(S.dataset.mulligan));
      T && !T.solo_purchased && !c.has("solo:" + T.id) && !h(T)?.supreme_purchased && k("golf_players", T, "mulligan_purchased", S.checked, "mulligan_purchased_at", "mulligan:" + T.id, "mulligan purchase");
    }
    if (S.matches("[data-putting]")) {
      const T = s.find((O) => O.id === Number(S.dataset.putting));
      T && !T.solo_purchased && !c.has("solo:" + T.id) && !h(T)?.supreme_purchased && k("golf_players", T, "putting_purchased", S.checked, "putting_purchased_at", "putting:" + T.id, "putting contest entry");
    }
    if (S.matches("[data-solo]")) {
      const T = s.find((O) => O.id === Number(S.dataset.solo));
      T && !c.has("mulligan:" + T.id) && !c.has("putting:" + T.id) && k("golf_players", T, "solo_purchased", S.checked, "solo_purchased_at", "solo:" + T.id, "Solo Package purchase");
    }
    if (S.matches("[data-supreme]")) {
      const T = n.find((O) => O.id === Number(S.dataset.supreme));
      T && k("golf_teams", T, "supreme_purchased", S.checked, "supreme_purchased_at", "supreme:" + T.id, "Supreme purchase for " + T.name);
    }
  }), r("search").oninput = v, r("filter").onchange = v, r("export").onclick = () => {
    const S = [["Name", "Team", "Status", "Checked in at", "Individual mulligan purchased", "Mulligan purchase time", "Supreme Team purchased", "Supreme purchase time", "Mulligan available", "Individual Putting Contest entry", "Putting purchase time", "Putting Contest included", "Solo Package $20 purchased", "Solo purchase time"], ...s.map((j) => {
      const B = h(j);
      return [j.name, f(j), j.checked_in ? "Arrived" : "Not arrived", j.checked_in_at || "", j.mulligan_purchased ? "Yes" : "No", j.mulligan_purchased_at || "", B?.supreme_purchased ? "Yes" : "No", B?.supreme_purchased_at || "", j.mulligan_purchased || j.solo_purchased || B?.supreme_purchased ? "Yes" : "No", j.putting_purchased ? "Yes" : "No", j.putting_purchased_at || "", j.putting_purchased || j.solo_purchased || B?.supreme_purchased ? "Yes" : "No", j.solo_purchased ? "Yes" : "No", j.solo_purchased_at || ""];
    })].map((j) => j.map((B) => '"' + String(B).replace(/"/g, '""') + '"').join(",")).join(`\r
`), T = document.createElement("a"), O = URL.createObjectURL(new Blob([S], { type: "text/csv;charset=utf-8" }));
    T.href = O, T.download = "hanwha-golf-attendance-purchases.csv", T.click(), setTimeout(() => URL.revokeObjectURL(O), 1e3);
  }, r("loginForm").onsubmit = async (b) => {
    b.preventDefault();
    const S = b.target.querySelector("button");
    S.disabled = true;
    r("loginMessage").textContent = "Signing in\u2026";
    try {
      const response = await fetch(e.url + "/functions/v1/volunteer-pin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: r("pin").value.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign-in failed.");
      const { error } = await t.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      if (error) throw error;
      r("pin").value = "";
      r("loginMessage").textContent = "Signed in.";
    } catch (T) {
      r("loginMessage").textContent = T.message;
    } finally {
      S.disabled = false;
    }
  }, r("logout").onclick = async () => {
    const { error: b } = await t.auth.signOut({ scope: "local" });
    b && d("Sign-out failed: " + b.message);
  }, setInterval(() => {
    a && document.visibilityState === "visible" && p();
  }, 3e4), document.addEventListener("visibilitychange", () => {
    a && document.visibilityState === "visible" && p();
  });
  async function w(b) {
    if (!(b?.user?.id === a?.id && i)) {
      if (a = b?.user || null, ++o, r("login").classList.toggle("hide", !!a), r("app").classList.toggle("hide", !a), i) {
        const S = i;
        i = null, await t.removeChannel(S);
      }
      if (!a) {
        s = [], n = [], v(), d("Sign in to begin check-in.");
        return;
      }
      r("identity").textContent = a.email === "shared-volunteers@golf-checkin.invalid" ? "Volunteer \xB7 Shared PIN" : a.email, await g(), i = t.channel("golf-attendance-purchases").on("postgres_changes", { event: "*", schema: "public", table: "golf_players" }, p).on("postgres_changes", { event: "*", schema: "public", table: "golf_teams" }, p).subscribe((S) => {
        S === "SUBSCRIBED" ? d("Connected \xB7 Live attendance and purchases synchronized") : ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(S) && d("Live connection interrupted \xB7 Attendance and purchases refresh every 30 seconds.");
      });
    }
  }
  const R = (b) => (l = l.then(() => w(b)).catch((S) => d("Unable to load check-in: " + S.message)), l);
  t.auth.onAuthStateChange((b, S) => {
    setTimeout(() => R(S), 0);
  });
  const { data: L, error: A } = await t.auth.getSession();
  if (A) throw A;
  await R(L.session);
  const C = new URLSearchParams(location.hash.slice(1)).get("error_description") || new URLSearchParams(location.search).get("error_description");
  C && (r("loginMessage").textContent = "Sign-in link failed: " + C + ". Request a new link below.");
}
ta().catch((r) => {
  document.getElementById("status").textContent = "Unable to start check-in: " + r.message;
});
