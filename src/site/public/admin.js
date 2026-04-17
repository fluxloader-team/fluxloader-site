const AdminPage = (() => {
	const state = {
		mods: {},
		modCache: {},
		users: {},
		userCache: {},
		actions: [],
		currentPage: 1,
		pageSize: 50,
		totalPages: 1,
	};

	// -------------------- Utility --------------------

	const spinnerHtml = `<div class="spinner-holder"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>`;

	const getAdminPageContent = () => document.getElementById("adminPageContent");

	function loadTemplate(id, pageClass) {
		const tpl = document.getElementById(`${id}`);
		if (!tpl) {
			console.error(`Template #${id} not found`);
			return;
		}

		const el = getAdminPageContent();
		el.className = `admin-page ${pageClass ?? ""}`;
		el.replaceChildren(tpl.content.cloneNode(true));
	}

	async function apiFetch(url, options = {}) {
		const res = await fetch(url, options);
		if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
		return res.json();
	}

	async function apiPost(url, body) {
		return apiFetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	function addAlert(message, type = "info") {
		const area = document.getElementById("alertArea");
		const t = document.createElement("div");
		t.className = `admin-alert admin-alert-${type}`;
		t.textContent = message;
		area.appendChild(t);
		// Trigger animation then remove
		requestAnimationFrame(() => t.classList.add("admin-alert-show"));
		setTimeout(() => {
			t.classList.remove("admin-alert-show");
			t.addEventListener("transitionend", () => t.remove(), { once: true });
		}, 3500);
	}

	async function confirmAction(message) {
		// Uses native confirm for now; can be swapped for a modal later
		return window.confirm(message);
	}

	// -------------------- Pages --------------------

	const pageControl = {
		"dashboard": {
			activate() {
				loadTemplate("tpl-dashboard", "admin-page-dashboard");
				getAdminPageContent().addEventListener("click", (e) => {
					const card = e.target.closest("[data-page]");
					if (card) pageControl[card.dataset.page]?.activate();
				});
			},
		},
		"mod-management": {
			async activate() {
				loadTemplate("tpl-mod-management", "admin-page-mods");
				await modsPage.search();
				document.getElementById("modSearchInput").addEventListener("input", () => modsPage.search());
				document.getElementById("modSearchType").addEventListener("change", () => modsPage.search());
			},
		},
		"user-management": {
			async activate() {
				loadTemplate("tpl-user-management", "admin-page-user-management");
				await usersPage.search();
				document.getElementById("userSearchInput").addEventListener("input", () => usersPage.search());
				document.getElementById("userSearchType").addEventListener("change", () => usersPage.search());
			},
		},
		"site-actions": {
			async activate() {
				loadTemplate("tpl-site-actions", "admin-page-site-actions");
				await actionsPage.load(1);
			},
		},
		"bans": {
			async activate() {
				loadTemplate("tpl-bans", "admin-page-bans");
				await bansPage.load();
			},
		}
	};

	const modsPage = {
		async search() {
			const text = document.getElementById("modSearchInput")?.value?.trim() ?? "";
			const query = text ? { "modData.name": { $regex: text, $options: "i" } } : {};
			const queryParam = encodeURIComponent(JSON.stringify(query));

			const verifiedType = document.getElementById("modSearchType")?.value ?? "all";
			const verifiedParam =
				verifiedType === "verified" ? "true" :
					verifiedType === "unverified" ? "false" :
						"null";

			try {
				const result = await apiFetch(`/api/mods?search=${queryParam}&verified=${verifiedParam}`);
				state.mods = {};
				(result.mods ?? []).forEach((m) => { state.mods[m.modID] = m; });
				modsPage.renderModTable();
			} catch (err) {
				console.error("Mod search failed:", err);
				addAlert("Failed to load mods.", "error");
			}
		},

		renderModTable() {
			const modTableContainer = document.getElementById("modTableContainer");
			if (!modTableContainer) return;

			const entries = Object.values(state.mods);
			if (entries.length === 0) {
				modTableContainer.innerHTML = `<p class="empty-message">No mods found. Try adjusting your filters.</p>`;
				const display = document.getElementById("modDetails");
				if (display) display.innerHTML = `<p class="empty-message">No mods to display.</p>`;
				const actions = document.getElementById("modDetailsActions");
				if (actions) actions.innerHTML = "";
				return;
			}

			modTableContainer.innerHTML = `
				<table class="item-table">
					<thead><tr><th>Name</th><th>Author</th><th>Version</th></tr></thead>
					<tbody>
						${entries.map((m) => `
							<tr class="item-table-row" data-modid="${m.modID}">
								<td>${m.modData.name}</td>
								<td>${m.modData.author}</td>
								<td>${m.modData.version}</td>
							</tr>
						`).join("")}
					</tbody>
				</table>`;

			modTableContainer.querySelectorAll(".item-table-row").forEach((row) => {
				row.addEventListener("click", () => modsPage.inspectModDetails(row.dataset.modid));
			});

			modsPage.inspectModDetails(entries[0].modID);
		},

		async inspectModDetails(modID) {
			const modDetails = document.getElementById("modDetails");
			if (!modDetails) return;

			const mod = state.mods[modID];
			if (!mod?.modData) {
				modDetails.innerHTML = `<p class="empty-message">Mod data unavailable.</p>`;
				return;
			}

			const { name = "Unknown", version = "Unknown", author = "Unknown", shortDescription = "", tags = [] } = mod.modData;

			const tagsHtml = tags.length
				? tags.map((t) => `<span class="badge text-bg-primary">${t}</span>`).join(" ")
				: `<span class="badge text-bg-secondary">No tags</span>`;

			modDetails.innerHTML = `
				<div class="detail-inner">
					<div class="detail-header">
						<h3 class="detail-name" id="modDetails-name">${name}</h3>
						<div class="detail-meta">
							<span class="badge text-bg-info">${version}</span>
							<span class="badge text-bg-warning">${author}</span>
						</div>
					</div>
					<p class="detail-short-desc" id="modDetails-short-desc">${shortDescription}</p>
					<div class="detail-tags" id="modDetails-tags">${tagsHtml}</div>

					<h5 class="section-title">Dependencies</h5>
					<div id="modDependencies" class="actions-table"></div>

					<h5 class="section-title">Readme</h5>
					<hr>
					<div id="modDisplayDescription" class="markdown-content"></div>
				</div>`;

			const modDeps = mod.modData.dependencies ?? {};
			const modDepsKeys = Object.keys(modDeps);
			document.getElementById("modDependencies").innerHTML = modDepsKeys.length
				? `<table class="item-table"><thead><tr><th>Name</th><th>Version</th></tr></thead><tbody>
					${modDepsKeys.map((k) => `<tr><td>${k}</td><td>${modDeps[k]}</td></tr>`).join("")}
				  </tbody></table>`
				: `<p class="empty-message">No dependencies.</p>`;

			await modsPage.updateActionsBar(modID);

			// Grab full mod details
			try {
				if (state.modCache[modID]) {
					await modsPage.populateModDetails(state.modCache[modID]);
				} else {
					const result = await apiFetch(`/api/mods?modid=${modID}&option=info`);
					if (result.mod) {
						state.modCache[result.mod.modID] = result.mod;
						await modsPage.populateModDetails(result.mod);
					}
				}
			} catch (err) {
				console.error("Error fetching mod detail:", err);
				const desc = document.getElementById("modDisplayDescription");
				if (desc) desc.innerHTML = `<em>Failed to load mod detail.</em>`;
			}
		},

		async populateModDetails(mod) {
			if (!mod?.modData) {
				modDetails.innerHTML = `<p class="empty-message">Mod data unavailable.</p>`;
				return;
			}

			const { name = "Unknown", version = "Unknown", author = "Unknown", shortDescription = "", description = "", tags = [] } = mod.modData;

			const tagsHtml = tags.length
				? tags.map((t) => `<span class="badge text-bg-primary">${t}</span>`).join(" ")
				: `<span class="badge text-bg-secondary">No tags</span>`;

			const nameEl = document.getElementById("modDetails-name");
			if (nameEl) nameEl.textContent = name;

			const shortEl = document.getElementById("modDetails-short-desc");
			if (shortEl) shortEl.textContent = shortDescription;

			const tagsEl = document.getElementById("modDetails-tags");
			if (tagsEl) tagsEl.innerHTML = tagsHtml;

			const descEl = document.getElementById("modDisplayDescription");
			if (descEl) {
				try { descEl.innerHTML = marked.parse(description); }
				catch { descEl.textContent = description; }
			}

			if (mod.modID) {
				await modsPage.updateActionsBar(mod.modID);
				try {
					const result = await apiFetch(`/api/mods?modid=${mod.modID}&option=versions`);
					if (result.versions) modsPage.updateVersionSelect(mod.modID, result.versions);
				} catch (err) {
					console.error("Error fetching versions:", err);
				}
			}
		},

		async getVersion(modID, version) {
			if (!version || version === "Change Version") return;
			try {
				const result = await apiFetch(`/api/mods?modid=${modID}&option=info&version=${version}`);
				if (result.mod) {
					state.modCache[result.mod.modID] = result.mod;
					await modsPage.populateModDetails(result.mod);
				}
			} catch (err) {
				console.error("Error fetching version:", err);
				addAlert("Failed to load version.", "error");
			}
		},

		updateVersionSelect(modID, versions) {
			const selectionEl = document.getElementById("versionSelection");
			if (!selectionEl) return;

			// Remove all except the first placeholder option
			while (selectionEl.options.length > 1) selectionEl.remove(1);

			if (!Array.isArray(versions) || versions.length === 0) {
				const opt = new Option("No versions available", "");
				opt.disabled = true;
				selectionEl.appendChild(opt);
				return;
			}
			versions.forEach((v) => { if (v) selectionEl.appendChild(new Option(v, v)); });
		},

		async updateActionsBar(modID) {
			const bar = document.getElementById("modDetailsActions");
			if (!bar) return;

			const mod = state.mods[modID];
			const authorId = mod?.Author?.discordID ?? null;

			bar.innerHTML = `
				<div class="details-action-group">
					<button class="btn btn-primary btn-sm" id="btnDownloadMod">Download</button>
					<button class="btn btn-success btn-sm" id="btnCopyModId">Copy ID</button>
					<select class="form-select form-select-sm" id="versionSelection">
						<option>Change Version</option>
					</select>
				</div>
				<div class="details-action-group">
					<button class="btn btn-success btn-sm" id="btnVerifyMod">Verify</button>
					<button class="btn btn-danger btn-sm" id="btnDenyMod">Deny</button>
					${authorId ? `<button class="btn btn-danger btn-sm" id="btnBanAuthor">Ban Author</button>` : ""}
				</div>`;

			document.getElementById("btnDownloadMod").addEventListener("click", () => modsPage.downloadMod(modID));
			document.getElementById("btnCopyModId").addEventListener("click", () => { navigator.clipboard.writeText(modID); addAlert("ID copied!", "success"); });
			document.getElementById("versionSelection").addEventListener("change", (e) => modsPage.getVersion(modID, e.target.value));
			document.getElementById("btnVerifyMod").addEventListener("click", () => modsPage.verifyMod(modID));
			document.getElementById("btnDenyMod").addEventListener("click", () => modsPage.denyMod(modID));
			if (authorId) document.getElementById("btnBanAuthor").addEventListener("click", () => usersPage.banUser(authorId));

			// Now that the select exists, populate it if we have a cached version list
			const cached = state.modCache[modID];
			if (cached) {
				try {
					const result = await apiFetch(`/api/mods?modid=${modID}&option=versions`);
					if (result.versions) modsPage.updateVersionSelect(modID, result.versions);
				} catch (e) {
					// silently continue, versions are non-critical
					console.error(e);
				}
			}
		},

		async downloadMod(modID) {
			const mod = state.mods[modID];
			if (!mod?.modID) { addAlert("Mod not found.", "error"); return; }
			try {
				const res = await fetch(`/api/mods?modid=${mod.modID}&option=download`);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = Object.assign(document.createElement("a"), { href: url, download: `${mod.modID}.zip` });
				a.style.display = "none";
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			} catch (err) {
				console.error("Download failed:", err);
				addAlert("Download failed.", "error");
			}
		},

		async verifyMod(modID) {
			if (!await confirmAction("Verify this mod?")) return;
			try {
				const result = await apiPost("/api/admin/actions", { action: "verify", modID });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				addAlert("Mod verified!", "success");
				await modsPage.search();
			} catch (err) {
				console.error(err);
				addAlert("Failed to verify mod.", "error");
			}
		},

		async denyMod(modID) {
			if (!await confirmAction("Deny and permanently delete this mod? This cannot be undone.")) return;
			try {
				const result = await apiPost("/api/admin/actions", { action: "deny", modID });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				addAlert("Mod denied and deleted.", "success");
				await modsPage.search();
			} catch (err) {
				console.error(err);
				addAlert("Failed to deny mod.", "error");
			}
		},
	};

	const usersPage = {
		async search() {
			const query = document.getElementById("userSearchInput")?.value ?? "";
			const type = document.getElementById("userSearchType")?.value ?? "all";

			try {
				const result = await apiPost("/api/users", { action: "searchUsers", search: query });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }

				state.users = {};
				(result.users ?? []).forEach((u) => {
					if (type === "admin" && !u.permissions.includes("admin")) return;
					if (type === "banned" && !u.banned) return;
					state.users[u.discordID] = u;
				});
				usersPage.renderUsersTable();
			} catch (err) {
				console.error("User search failed:", err);
				addAlert("Failed to load users.", "error");
			}
		},

		renderUsersTable() {
			const usersTableContainer = document.getElementById("usersTableContainer");
			if (!usersTableContainer) return;

			const entries = Object.values(state.users);
			if (entries.length === 0) {
				usersTableContainer.innerHTML = `<p class="empty-message">No users found.</p>`;
				return;
			}

			usersTableContainer.innerHTML = `
				<table class="item-table">
					<thead><tr><th>Username</th><th>Status</th></tr></thead>
					<tbody>
						${entries.map((u) => {
				const badges = [
					u.banned ? `<span class="badge bg-danger">Banned</span>` : "",
					u.permissions.includes("admin") ? `<span class="badge bg-success">Admin</span>` : "",
				].join(" ");
				return `<tr class="item-table-row" data-userid="${u.discordID}"><td>${u.discordUsername}</td><td>${badges}</td></tr>`;
			}).join("")}
					</tbody>
				</table>`;

			usersTableContainer.querySelectorAll(".item-table-row").forEach((row) => {
				row.addEventListener("click", () => usersPage.inspectUserDetails(row.dataset.userid));
			});

			usersPage.inspectUserDetails(entries[0].discordID);
		},

		async inspectUserDetails(discordID) {
			const user = state.users[discordID];
			const display = document.getElementById("userDisplay");
			if (!display || !user) return;

			const banBadge = `<span class="badge ${user.banned ? "bg-danger" : "bg-success"}">${user.banned ? "Banned" : "Active"}</span>`;
			const adminBadge = `<span class="badge ${user.permissions.includes("admin") ? "bg-success" : "bg-secondary"}">${user.permissions.includes("admin") ? "Admin" : "User"}</span>`;

			display.innerHTML = `
				<div class="detail-inner">
					<div class="detail-header">
						<h3 class="detail-name">${user.discordUsername}</h3>
						<div class="detail-meta">${banBadge} ${adminBadge}</div>
					</div>
					<p>Discord ID: <code>${user.discordID}</code></p>
					<p>Joined: ${new Date(user.joinedAt).toLocaleString()}</p>
					<h4 class="section-title">Stats</h4>
					<div id="userStats">${spinnerHtml}</div>
				</div>`;

			await usersPage.updateActionsBar(discordID);

			try {
				if (state.userCache[discordID]) {
					usersPage.populateUserDetailsStats(state.userCache[discordID]);
				} else {
					const result = await apiPost("/api/users", { action: "usersDetails", userID: discordID });
					if (result.error) { addAlert("Error: " + result.error, "error"); return; }
					state.userCache[discordID] = result;
					usersPage.populateUserDetailsStats(result);
				}
			} catch (err) {
				console.error("Error loading user stats:", err);
				const stats = document.getElementById("userStats");
				if (stats) stats.innerHTML = `<em>Failed to load stats.</em>`;
			}
		},

		populateUserDetailsStats(userData) {
			const statsEl = document.getElementById("userStats");
			if (!statsEl) return;
			const { stats } = userData;

			const versionsHtml = (stats.modVersions ?? []).map((v) => `
				<tr>
					<td>${v.modName}</td>
					<td>${v.version.modData.version}</td>
					<td>${new Date(v.version.uploadTime).toLocaleString()}</td>
				</tr>`).join("");

			statsEl.innerHTML = `
				<p>Mods uploaded: <strong>${stats.modsUploaded}</strong></p>
				<p>Mod versions uploaded: <strong>${stats.modVersionsUploaded}</strong></p>
				${stats.modVersionsUploaded > 0 ? `
					<table class="item-table table-sm">
						<thead><tr><th>Mod Name</th><th>Version</th><th>Upload Time</th></tr></thead>
						<tbody>${versionsHtml}</tbody>
					</table>` : ""}`;
		},

		async updateActionsBar(discordID) {
			const bar = document.getElementById("userDisplayActions");
			if (!bar) return;
			const user = state.users[discordID];

			bar.innerHTML = `
				<div class="details-action-group">
					<button class="btn btn-success btn-sm" id="btnCopyUserId">Copy ID</button>
				</div>
				<div class="details-action-group">
					${user.banned
					? `<button class="btn btn-success btn-sm" id="btnUnbanUser">Unban User</button>`
					: `<button class="btn btn-danger btn-sm" id="btnBanUser">Ban User</button>`}
					${user.permissions.includes("admin")
					? `<button class="btn btn-warning btn-sm" id="btnRemoveAdmin">Remove Admin</button>`
					: `<button class="btn btn-primary btn-sm" id="btnSetAdmin">Set as Admin</button>`}
				</div>`;

			document.getElementById("btnCopyUserId").addEventListener("click", () => { navigator.clipboard.writeText(discordID); addAlert("ID copied!", "success"); });

			if (user.banned) {
				document.getElementById("btnUnbanUser").addEventListener("click", () => usersPage.unbanUser(discordID));
			} else {
				document.getElementById("btnBanUser").addEventListener("click", () => usersPage.banUser(discordID));
			}

			if (user.permissions.includes("admin")) {
				document.getElementById("btnRemoveAdmin").addEventListener("click", () => usersPage.removeUserAdmin(discordID));
			} else {
				document.getElementById("btnSetAdmin").addEventListener("click", () => usersPage.setUserAdmin(discordID));
			}
		},

		async banUser(discordID) {
			if (!await confirmAction("Ban this user? They will be prevented from uploading mods.")) return;
			try {
				const result = await apiPost("/api/admin/actions", { action: "banAuthor", authorID: discordID });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				state.users[discordID].banned = true;
				delete state.userCache[discordID];
				addAlert("User banned.", "success");
				await usersPage.inspectUserDetails(discordID);
			} catch (err) { console.error(err); addAlert("Failed to ban user.", "error"); }
		},

		async unbanUser(discordID) {
			if (!await confirmAction("Unban this user?")) return;
			try {
				const result = await apiPost("/api/admin/actions", { action: "unbanUser", authorID: discordID });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				state.users[discordID].banned = false;
				delete state.userCache[discordID];
				addAlert("User unbanned.", "success");
				await usersPage.inspectUserDetails(discordID);
			} catch (err) { console.error(err); addAlert("Failed to unban user.", "error"); }
		},

		async setUserAdmin(discordID) {
			if (!await confirmAction("Grant admin to this user?")) return;
			try {
				const result = await apiPost("/api/admin/actions", { action: "setAdmin", authorID: discordID });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				if (!state.users[discordID].permissions.includes("admin")) state.users[discordID].permissions.push("admin");
				delete state.userCache[discordID];
				addAlert("Admin granted.", "success");
				await usersPage.inspectUserDetails(discordID);
			} catch (err) { console.error(err); addAlert("Failed to set admin.", "error"); }
		},

		async removeUserAdmin(discordID) {
			if (!await confirmAction("Remove admin from this user?")) return;
			try {
				const result = await apiPost("/api/admin/actions", { action: "removeAdmin", authorID: discordID });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				state.users[discordID].permissions = state.users[discordID].permissions.filter((p) => p !== "admin");
				delete state.userCache[discordID];
				addAlert("Admin removed.", "success");
				await usersPage.inspectUserDetails(discordID);
			} catch (err) { console.error(err); addAlert("Failed to remove admin.", "error"); }
		},

		async banUser(authorID) {
			if (!await confirmAction("Ban this author?")) return;
			try {
				const result = await apiPost("/api/admin/actions", { action: "banAuthor", authorID });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				addAlert("Author banned.", "success");
			} catch (err) { console.error(err); addAlert("Failed to ban author.", "error"); }
		},

		// Called from the Bans page
		async unbanFromList(discordID) {
			if (!await confirmAction("Unban this user?")) return;
			try {
				const result = await apiPost("/api/admin/actions", { action: "unbanUser", authorID: discordID });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				addAlert("User unbanned.", "success");
				await bansPage.load();
			} catch (err) { console.error(err); addAlert("Failed to unban user.", "error"); }
		},
	};

	const actionsPage = {
		async load(page = 1) {
			state.currentPage = page;
			try {
				const result = await apiPost("/api/actions", { page, size: state.pageSize });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				state.actions = result.actions;
				state.totalPages = result.pagination.totalAdminPages;
				actionsPage.render();
			} catch (err) {
				console.error("Error loading actions:", err);
				addAlert("Failed to load actions.", "error");
			}
		},

		render() {
			const actionsTable = document.getElementById("actionsTable");
			if (!actionsTable) return;

			actionsTable.innerHTML = `
				<table class="item-table table table-striped">
					<thead><tr><th>User ID</th><th>Action</th><th>Time</th></tr></thead>
					<tbody>
						${state.actions.map((a) => `
							<tr>
								<td><code>${a.discordID}</code></td>
								<td>${a.action}</td>
								<td>${new Date(a.time).toLocaleString()}</td>
							</tr>`).join("")}
					</tbody>
				</table>`;

			const paginationEl = document.getElementById("actionsPagination");
			if (!paginationEl) return;

			const { currentPage, totalPages } = state;
			const pages = [];
			pages.push(`<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
				<a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a></li>`);

			for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
				pages.push(`<li class="page-item ${i === currentPage ? "active" : ""}">
					<a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
			}

			pages.push(`<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
				<a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`);

			paginationEl.innerHTML = pages.join("");
			paginationEl.querySelectorAll("[data-page]").forEach((a) => {
				a.addEventListener("click", (e) => {
					e.preventDefault();
					const p = parseInt(e.currentTarget.dataset.page);
					if (p >= 1 && p <= state.totalPages) actionsPage.load(p);
				});
			});
		},
	};

	const bansPage = {
		async load() {
			try {
				const result = await apiPost("/api/users", { action: "listUsers" });
				if (result.error) { addAlert("Error: " + result.error, "error"); return; }
				const banned = (result.users ?? []).filter((u) => u.banned);
				bansPage.render(banned);
			} catch (err) {
				console.error("Error loading bans:", err);
				addAlert("Failed to load banned users.", "error");
			}
		},

		render(bannedUsers) {
			const list = document.getElementById("bannedUsersList");
			if (!list) return;

			if (bannedUsers.length === 0) {
				list.innerHTML = `<p class="empty-message">No banned users.</p>`;
				return;
			}

			list.innerHTML = `
				<table class="item-table table table-striped">
					<thead><tr><th>Username</th><th>Discord ID</th><th>Joined</th><th>Actions</th></tr></thead>
					<tbody>
						${bannedUsers.map((u) => `
							<tr>
								<td>${u.discordUsername}</td>
								<td><code>${u.discordID}</code></td>
								<td>${new Date(u.joinedAt).toLocaleString()}</td>
								<td><button class="btn btn-success btn-sm" data-unban="${u.discordID}">Unban</button></td>
							</tr>`).join("")}
					</tbody>
				</table>`;

			list.querySelectorAll("[data-unban]").forEach((btn) => {
				btn.addEventListener("click", () => usersPage.unbanFromList(btn.dataset.unban));
			});
		},
	};

	// -------------------- Interface --------------------

	function init() {
		pageControl.dashboard.activate();

		document.getElementById("btnSelection").addEventListener("click", () => {
			pageControl.dashboard.activate();
		});
	}

	return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
	AdminPage.init();
});
