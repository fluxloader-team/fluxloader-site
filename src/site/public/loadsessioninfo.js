function loadSessionInfo(containerId) {
	const container = document.getElementById(containerId);
	if (!container) throw new Error(`Missing header container: ${containerId}`);

	updateUIToLogin(container);

	// load cached info if present
	let sessionInfoCache = null;
	try {
		sessionInfoCache = JSON.parse(localStorage.getItem("sessionInfoCache"));
		console.log("Loaded session info from cache:", sessionInfoCache);

		if (sessionInfoCache && sessionInfoCache.expires > Date.now()) {
			updateUIToLogout(container, sessionInfoCache.user);
		}
	} catch {}

	_ = loadSessionInfoFromServer(container, sessionInfoCache);
}

async function loadSessionInfoFromServer(container, sessionInfoCache) {
	try {
		// Revalidate session info in the background against the server
		const res = await fetch("/api/session", { credentials: "include" });
		let sessionInfo = await res.json();
		console.log("Refreshed session info from server:", sessionInfo);

		localStorage.setItem("sessionInfoCache", JSON.stringify(sessionInfo));

		// Update UI only if authentication state has changed
		if (sessionInfoCache != null && sessionInfoCache.authenticated !== sessionInfo.authenticated) {
			if (sessionInfo.authenticated) {
				updateUIToLogout(container, sessionInfo.user);
			} else {
				updateUIToLogin(container);
			}
		}
	} catch (err) {
		console.error("Failed to refresh session info:", err);
	}
}

function updateUIToLogin(container) {
	container.innerHTML = `
		<button class="btn btn-primary" id="discordLogin">
			<img src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d718355f9c89eb0fd350_Logo.svg" alt="discord Logo"
			     style="width:100px; height:20px; margin-right:5px;" />
		</button>`;

	document.getElementById("discordLogin").addEventListener("click", () => handleLogin(container));
}

function updateUIToLogout(container, user) {
	const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png";

	container.innerHTML = `
		<div class="dropdown">
			<button class="btn dropdown-toggle" type="button" id="discordDropdownButton" data-bs-toggle="dropdown" aria-expanded="false"
				style="display:flex; align-items:center; gap:0.5rem;">
				<img src="${avatarUrl}" alt="n/a" class="rounded-circle" style="width:30px;height:30px;" />
				${user.username}
			</button>
			<ul class="dropdown-menu" aria-labelledby="discordDropdownButton">
				<li><a class="dropdown-item" href="/upload">Upload Mod</a></li>
				<li><hr class="dropdown-divider"></li>
				<li><a class="dropdown-item" id="logoutButton">Logout</a></li>
			</ul>
		</div>`;

	document.getElementById("logoutButton").addEventListener("click", () => handleLogout(container));
}

async function handleLogout(container) {
	try {
		await fetch("/logout", { method: "POST", credentials: "include" });
	} catch (err) {
		console.warn("Server logout failed:", err);
	}

	localStorage.removeItem("sessionInfoCache");
	document.cookie = "session=; path=/; max-age=0";
	updateUIToLogin(container);
}

function handleLogin(container) {
	const popup = window.open("/auth/discord", "discordLogin", "width=500,height=700");

	window.addEventListener("message", function messageHandler(event) {
		if (!event.data || event.data.type !== "discordAuth") return;
		window.removeEventListener("message", messageHandler);
		popup.close();

		const { sessionInfo } = event.data;
		if (!sessionInfo.authenticated) return;

		localStorage.setItem("sessionInfoCache", JSON.stringify(sessionInfo));
		const maxAge = Math.floor((sessionInfo.expires - Date.now()) / 1000);
		document.cookie = `session=${sessionInfo.token}; path=/; max-age=${maxAge}`;
		updateUIToLogout(container, sessionInfo.user);
	});
}
