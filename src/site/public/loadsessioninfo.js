function loadSessionInfo(containerId) {
	// Grab element references
	const container = document.getElementById(containerId);
	if (!container) throw new Error(`Missing header container: ${containerId}`);

	// load cached info if present
	let cached = null;
	try {
		cached = JSON.parse(localStorage.getItem("sessionInfoCache"));
		if (cached && cached.expires > Date.now()) {
			updateUIWithLoggedIn(container, cached.user);
		}
	} catch {}

	_ = loadSessionInfoFromServer(container, cached);
}

async function loadSessionInfoFromServer(container, cached) {
	// Go and revalidate session info in the background
	// This ensures that if the server is different from the cache we reload
	try {
		const res = await fetch("/api/sessioninfo", { credentials: "include" });
		const data = await res.json();

		// Exit early if not authenticated
		if (!data.authenticated) {
			// If the cache exists clear it and update UI
			if (cached) {
				localStorage.removeItem("sessionInfoCache");
				updateUIWithLoggedOut(container);
				location.reload();
				return;
			}
		}

		// We are authenticated so cache the user info
		localStorage.setItem("sessionInfoCache", JSON.stringify({ user: data, expires: Date.now() + 10 * 60 * 1000 }));

		// If the cached user is different from the fetched user reload the page
		if (!cached || cached.user.id !== data.id) {
			location.reload();
			return;
		}

		updateUIWithLoggedIn(container, data);
	} catch (err) {
		console.error("Failed to refresh session info:", err);
	}
}

function updateUIWithLoggedOut(container) {
	container.innerHTML = `
		<a href="/auth/discord" class="btn btn-primary" style="margin-right: 15px" id="discordLogin">
			<img src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d718355f9c89eb0fd350_Logo.svg" alt="discord Logo" title="Login with Discord" style="width: 100px; height: 20px; margin-right: 5px" />
		</a>`;
}

function updateUIWithLoggedIn(container, user) {
	container.innerHTML = `
		<div class="dropdown">
			<button class="btn dropdown-toggle" type="button" id="discordDropdownButton" data-bs-toggle="dropdown" aria-expanded="false">
				<img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png"
				     alt="n/a" class="rounded-circle" style="width:30px;height:30px;margin-right:5px;" />
				${user.username}
			</button>
			<ul class="dropdown-menu" aria-labelledby="discordDropdownButton">
				<li><a class="dropdown-item" href="/upload">Upload Mod</a></li>
				<li><hr class="dropdown-divider"></li>
				<li><a class="dropdown-item" href="/logout">Logout</a></li>
			</ul>
		</div>`;
}

