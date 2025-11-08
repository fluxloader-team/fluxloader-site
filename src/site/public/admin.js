const discordUser = JSON.parse(localStorage.getItem("discordUser"));

if (discordUser) {
	console.log("discord User:", discordUser);

	const discordDropdown = document.createElement("div");
	discordDropdown.className = "dropdown";
	discordDropdown.innerHTML = `
		<button class="btn dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
			<img src="https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png" alt="${discordUser.global_name}" class="rounded-circle" style="width: 30px; height: 30px; margin-right: 5px;">
			${discordUser.global_name}
		</button>
		<ul class="dropdown-menu" aria-labelledby="userDropdown">
			<li><a class="dropdown-item" href="/upload">Upload Mod</a></li>
			<li><hr class="dropdown-divider"></li>
			<li><a class="dropdown-item" href="#" id="logoutButton">Logout</a></li>
		</ul>`;

	const headerContainer = document.getElementById("headerContainer");
	headerContainer.removeChild(document.getElementById("discordLogin"));
	headerContainer.appendChild(discordDropdown);

	const logoutButton = document.getElementById("logoutButton");
	logoutButton.addEventListener("click", function () {
		localStorage.removeItem("discordUser");
		window.location.reload();
	});
} else {
	window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", async () => {
	var response = await fetch("/api/admin/page", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			discordUser: discordUser,
		}),
	});
	var result = await response.json();
	if (result.error) {
		window.location.href = "/";
	} else {
		Function(result.run)();
	}
});
