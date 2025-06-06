console.log("admin page loaded");
var styleContainer = document.getElementById("styleContainer");
globalThis.BaseStyle = `
     body,
	html {
		margin: 0;
		padding: 0;
        overflow: hidden;
	}
	.pagecontainer {
		height: 100vh;
		width: 100vw;
		display: flex;
		flex-direction: column;
	}
	.headerContainer {
		background-color: #222222;
		color: white;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		height: 50px;
	}
`;
globalThis.UpdatePageStyle = function (style) {
	globalThis.PageStyle = `
    ${BaseStyle}
    ${style}
`;
	styleContainer.textContent = PageStyle;
};
globalThis.UpdatePageStyle(`
    .fullpage{
        width:100%;
        height:100%;
    }
    .adminpage{
        display: flex;
        flex-direction: row;
        width:100%;
        height:calc(100%);
    }
    .adminpageColumn{
        display: flex;
        flex-direction: column;
        border: 10px solid #222222;
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;
        height: calc(100% );
    }`);
globalThis.adminPageData = document.getElementById("adminPageData");
globalThis.Pages = {
	Selection: {
		content: `
    <div class="adminpageColumn" style="width: 100%;gap:10px">
        <button class="btn btn-primary" onclick="Pages.ModManagement.action()">Mod Management</button>
        <button class="btn btn-primary" onclick="Pages.UserManagement.action()">User Management</button>
        <button class="btn btn-primary" onclick="Pages.SiteActions.action()">Site Actions</button>
        <button class="btn btn-primary" onclick="Pages.Bans.action()">Bans</button>
        <button class="btn btn-primary" onclick="Pages.Config.action()">Config</button>
    </div>
        `,
		action: function () {
			adminPageData.innerHTML = Pages.Selection.content;
		},
	},
	UserManagement: {
		content: `
    <div class="adminpageColumn" style="width: 500px;">
        <div id="Searchholder">
            <input type="text" id="userSearchInput" placeholder="Search Users" style="width: 370px;" onchange="globalThis.PerformUserSearch()"/>
            <select id="userSearchType" onchange="globalThis.PerformUserSearch()">
                <option value="all">All</option>
                <option value="admin">Admins</option>
                <option value="banned">Banned</option>
            </select>
        </div>
        <div id="userList">

        </div>
    </div>
    <div class="adminpageColumn" style="width: calc(100% - 500px);height: calc(100% - 90px)">
    <div class="userDisplay">
            <div class="userDisplayData" id="userDisplay">
                <div class="d-flex justify-content-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="userDisplayActions" id="userDisplayActions">

    </div>
        `,
		action: async function () {
			adminPageData.innerHTML = Pages.UserManagement.content;
			globalThis.UpdatePageStyle(`
    .fullpage{
        width:100%;
        height:100%;
    }
    .adminpage{
        display: flex;
        flex-direction: row;
        width:100%;
        height:calc(100% - 45px);
    }
    .adminpageColumn{
        display: flex;
        flex-direction: column;
        border: 10px solid #222222;
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;
        height: calc(100% );
    }
    .userList {
        width: 50%;
        height: calc(100% - 45px);
        display: flex;
        flex-direction: column;
        padding: 10px;
        border: 10px solid #222222;
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;
    }
    .userListItem{
        border-bottom: 3px solid #2c2c2c;
    }
    .userListItem:hover{
        background-color: #494949;
    }
    .userDisplay {
        width: calc(100%);
        height: calc(100%);
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;
    }
    .userDisplayData {
        padding: 10px;
        scrollbar-width: none;
        width: 100%;
        height: calc(100% - 50px);
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
    }
    .userDisplayActions{
        background-color: #222222;
        position: absolute;
        bottom: 0;
        right: 0;
        width: calc(100% - 500px);
        height: 155px;
        display: flex;
        flex-direction: row;
        gap: 10px;
    }`);
			await globalThis.PerformUserSearch();
		},
	},
	SiteActions: {
		content: `
    <div class="adminpageColumn" style="width: 100%;">
        <h3>Site Actions</h3>
        <div id="actionsList">
            <div class="d-flex justify-content-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
        <nav aria-label="Actions pagination">
            <ul class="pagination" id="actionsPagination">
            </ul>
        </nav>
    </div>
        `,
		action: async function () {
			adminPageData.innerHTML = Pages.SiteActions.content;
			globalThis.UpdatePageStyle(`
    .fullpage{
        width:100%;
        height:100%;
    }
    .adminpage{
        display: flex;
        flex-direction: column;
        width:100%;
        height:calc(100% - 45px);
        overflow-y: auto;
    }
    .adminpageColumn{
        display: flex;
        flex-direction: column;
        border: 10px solid #222222;
        padding: 20px;
        height: 100%;
    }
    .pagination {
        margin-top: 20px;
        justify-content: center;
    }`);
			await globalThis.LoadActions();
		},
	},
	Bans: {
		content: `
    <div class="adminpageColumn" style="width: 100%;">
        <h3>Banned Users</h3>
        <div id="bannedUsersList">
            <div class="d-flex justify-content-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    </div>
        `,
		action: async function () {
			adminPageData.innerHTML = Pages.Bans.content;
			globalThis.UpdatePageStyle(`
    .fullpage{
        width:100%;
        height:100%;
    }
    .adminpage{
        display: flex;
        flex-direction: column;
        width:100%;
        height:calc(100% - 45px);
        overflow-y: auto;
    }
    .adminpageColumn{
        display: flex;
        flex-direction: column;
        border: 10px solid #222222;
        padding: 20px;
        height: 100%;
    }`);
			await globalThis.LoadBannedUsers();
		},
	},
	Config: {
		content: `
    <div class="adminpageColumn" style="width: 100%;">
        <h3>Config Editor</h3>
        <div id="configEditor" style="width: 100%; height: 500px; border: 1px solid #ccc;"></div>
        <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="globalThis.SaveConfig()">Save Config</button>
            <button class="btn btn-secondary" onclick="globalThis.LoadConfig()">Reload Config</button>
        </div>
    </div>
        `,
		action: async function () {
			adminPageData.innerHTML = Pages.Config.content;
			globalThis.UpdatePageStyle(`
    .fullpage{
        width:100%;
        height:100%;
    }
    .adminpage{
        display: flex;
        flex-direction: column;
        width:100%;
        height:calc(100% - 45px);
        overflow-y: auto;
    }
    .adminpageColumn{
        display: flex;
        flex-direction: column;
        border: 10px solid #222222;
        padding: 20px;
        height: 100%;
    }`);

			// Initialize Monaco Editor
			require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs" } });
			require(["vs/editor/editor.main"], function () {
				globalThis.configEditor = monaco.editor.create(document.getElementById("configEditor"), {
					value: "// Loading config...",
					language: "json",
					theme: "vs-dark",
					automaticLayout: true,
				});

				globalThis.LoadConfig();
			});
		},
	},
	ModManagement: {
		content: `
    <div class="adminpageColumn" style="width: 500px;">
        <div id="Searchholder">
            <input type="text" id="searchInput" placeholder="Search Mods" style="width: 370px;" onchange="globalThis.PerformSearch()"/>
            <select id="searchtype" onchange="globalThis.PerformSearch()">
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
            </select>
        </div>
        <div id="modList">

        </div>
    </div>
    <div class="adminpageColumn" style="width: calc(100% - 500px);height: calc(100% - 90px)">
    <div class="modDisplay">
			<div class="modDisplayData" id="modDisplay">
				<div class="d-flex justify-content-center">
					<div class="spinner-border" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
				</div>
			</div>
		</div>
    </div>
    <div class="modDisplayActions" id="modDisplayActions">

    </div>
        `,
		action: async function () {
			adminPageData.innerHTML = Pages.ModManagement.content;
			globalThis.UpdatePageStyle(`
    .fullpage{
        width:100%;
        height:100%;
    }
    .adminpage{
        display: flex;
        flex-direction: row;
        width:100%;
        height:calc(100% - 45px);
    }
    .adminpageColumn{
        display: flex;
        flex-direction: column;
        border: 10px solid #222222;
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;
        height: calc(100% );
    }
	.modList {
		width: 50%;
		height: calc(100% - 45px);
		display: flex;
		flex-direction: column;
        padding: 10px;
        border: 10px solid #222222;
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;
	}
    .modListItem{
        border-bottom: 3px solid #2c2c2c;
    }
    .modListItem:hover{
        background-color: #494949;
    }
	.modDisplay {
		width: calc(100%);
		height: calc(100%);
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;
	}
    .modDisplayData {
        padding: 10px;
        scrollbar-width: none;
        width: 100%;
        height: calc(100% - 50px);
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
    }
    .modDisplayActions{
        background-color: #222222;
        position: absolute;
        bottom: 0;
        right: 0;
        width: calc(100% - 500px);
        height: 155px;
        display: flex;
        flex-direction: row;
        gap: 10px;
    }`);
			var verifiedOnly = "";
			switch (document.getElementById("searchtype").value) {
				case "verified":
					verifiedOnly = "true";
					break;
				case "unverified":
					verifiedOnly = "false";
					break;
				default:
					verifiedOnly = "null";
					break;
			}

			// Initialize with an empty search query (returns all mods)
			let searchQuery = {};

			// Convert the query object to a JSON string and encode it for URL
			globalThis.SearchQuery = encodeURIComponent(JSON.stringify(searchQuery));

			var response = await fetch(`/api/mods?search=${globalThis.SearchQuery}&verified=${verifiedOnly}`);
			var result = await response.json();
			console.log(result.mods);
			globalThis.Mods = {};
			if (result.mods && Array.isArray(result.mods)) {
				result.mods.forEach((mod) => {
					globalThis.Mods[mod.modID] = mod;
				});
			}
			console.log("Response:", result.mods);
			UpdateModList();
		},
	},
};
globalThis.Pages.Selection.action();

globalThis.SearchQuery = "";
globalThis.UpdateModList = function () {
	var modList = document.getElementById("modList");
	var modItems = "";
	Object.values(globalThis.Mods).forEach((mod) => {
		modItems += `<tr class="modListItem" onclick='globalThis.DisplayMod("${mod.modID}")'><td>${mod.modData.name}</td><td>${mod.modData.author}</td><td>${mod.modData.version}</td></tr>`;
	});
	modList.innerHTML = `<table class="displayInner"><tr><th width="200">Name</th><th width="200">Author</th><th width="100">Version</th></tr> ${modItems}`;
	modList.innerHTML += "</table>";

	// Check if there are any mods before trying to display the first one
	if (Object.values(globalThis.Mods).length > 0) {
		globalThis.DisplayMod(Object.values(globalThis.Mods)[0].modID);
	} else {
		// Display a message when no mods are found
		var modDisplay = document.getElementById("modDisplay");
		if (modDisplay) {
			modDisplay.innerHTML = `<div class="displayInner">
                <h3>No mods found</h3>
                <p>Try changing your search criteria or verification filter.</p>
            </div>`;
		}

		// Clear the actions panel
		var modDisplayActions = document.getElementById("modDisplayActions");
		if (modDisplayActions) {
			modDisplayActions.innerHTML = "";
		}
	}
};
globalThis.PerformSearch = async function () {
	var searchInput = document.getElementById("searchInput");
	var searchText = searchInput.value;
	var verifiedOnly = "";
	switch (document.getElementById("searchtype").value) {
		case "verified":
			verifiedOnly = "true";
			break;
		case "unverified":
			verifiedOnly = "false";
			break;
		default:
			verifiedOnly = "null";
			break;
	}

	// Create a MongoDB query object based on the search text
	let searchQuery;
	if (searchText && searchText.trim() !== "") {
		// Create a regex search for the mod name
		searchQuery = {
			"modData.name": {
				$regex: searchText,
				$options: "i", // case-insensitive
			},
		};
	} else {
		// Empty search returns all mods
		searchQuery = {};
	}

	// Convert the query object to a JSON string and encode it for URL
	globalThis.SearchQuery = encodeURIComponent(JSON.stringify(searchQuery));

	var response = await fetch(`/api/mods?search=${globalThis.SearchQuery}&verified=${verifiedOnly}`);
	var result = await response.json();
	console.log(result.mods);
	globalThis.Mods = {};
	if (result.mods && Array.isArray(result.mods)) {
		result.mods.forEach((mod) => {
			globalThis.Mods[mod.modID] = mod;
		});
	}
	console.log("Response:", result.mods);
	UpdateModList();
};
globalThis.DisplayMod = async function (modID) {
	// Check if the mod exists
	var mod = globalThis.Mods[modID];
	if (!mod) {
		console.error(`Mod with ID ${modID} not found`);
		var modDisplay = document.getElementById("modDisplay");
		modDisplay.innerHTML = `<div class="displayInner">
            <h3>Mod not found</h3>
            <p>The requested mod could not be found. It may have been removed or the ID is incorrect.</p>
        </div>`;

		// Clear the actions panel
		var modDisplayActions = document.getElementById("modDisplayActions");
		if (modDisplayActions) {
			modDisplayActions.innerHTML = "";
		}
		return;
	}

	// Check if the mod has the required properties
	if (!mod.modData) {
		console.error(`Mod with ID ${modID} has no modData property`);
		var modDisplay = document.getElementById("modDisplay");
		modDisplay.innerHTML = `<div class="displayInner">
            <h3>Invalid mod data</h3>
            <p>The mod data is invalid or incomplete.</p>
        </div>`;
		return;
	}

	var modDisplay = document.getElementById("modDisplay");

	// Safely access mod properties with fallbacks for missing data
	const name = mod.modData.name || "Unknown";
	const version = mod.modData.version || "Unknown";
	const author = mod.modData.author || "Unknown";
	const shortDescription = mod.modData.shortDescription || "No description available";
	const tags = Array.isArray(mod.modData.tags) ? mod.modData.tags : [];
	const tagsHtml = tags.length > 0 ? `<span class="badge text-bg-primary">${tags.join('</span><a> </a><span class="badge text-bg-primary">')}</span>` : '<span class="badge text-bg-secondary">No tags</span>';

	modDisplay.innerHTML = `<div class="displayInner">
<h3 id="modDisplayModName">${name}<a> </a><span class="badge text-bg-info">${version}</span><a> </a><span class="badge text-bg-warning">${author}</span></h3>
<h6 id="modDisplayshortDescription">${shortDescription}</h6>
<h6 id="modDisplayTags">${tagsHtml}</h6>
<br>
<h5>Dependencies</h5>
<div id="dependencies">

</div>
<br>
<h5>Mod Readme file</h5>
<hr>
<p id="modDisplayDescription">
</p>
<h6></h6>
</div>`;
	var dependenciesList = document.getElementById("dependencies");
	var dependencies = "";
	if (mod.modData.dependencies && typeof mod.modData.dependencies === "object") {
		Object.keys(mod.modData.dependencies).forEach((dependency) => {
			dependencies += `<tr><td>${dependency}</td><td>${mod.modData.dependencies[dependency]}</td></tr>`;
		});
	}
	dependenciesList.innerHTML = `<table><tr><th style="width: 250px">Name</th><th style="width: 250px">Version</th></tr> ${dependencies}`;
	dependenciesList.innerHTML += "</table>";

	try {
		if (globalThis.ModCache[mod.modID]) {
			await globalThis.DisplayModApi(globalThis.ModCache[mod.modID]);
		} else {
			var response = await fetch(`/api/mods?modid=${mod.modID}&option=info`);
			var result = await response.json();
			console.log("Response:", result.mod);
			if (result.mod) {
				globalThis.ModCache[result.mod.modID] = result.mod;
				await globalThis.DisplayModApi(globalThis.ModCache[result.mod.modID]);
			} else {
				console.error(`API returned no mod data for ID ${mod.modID}`);
				document.getElementById("modDisplayDescription").innerHTML = "Failed to load detailed mod information.";
			}
		}
	} catch (error) {
		console.error(`Error fetching mod details: ${error.message}`);
		document.getElementById("modDisplayDescription").innerHTML = "An error occurred while loading mod details.";
	}
};
globalThis.ModCache = {};
globalThis.DisplayModApi = async function (mod) {
	try {
		// Check if mod and modData exist
		if (!mod || !mod.modData) {
			console.error("Invalid mod data provided to DisplayModApi");
			document.getElementById("modDisplayDescription").innerHTML = "Error: Invalid mod data";
			return;
		}

		// Safely access mod properties with fallbacks
		const name = mod.modData.name || "Unknown";
		const version = mod.modData.version || "Unknown";
		const author = mod.modData.author || "Unknown";
		const shortDescription = mod.modData.shortDescription || "No description available";
		const description = mod.modData.description || "No detailed description available";
		const tags = Array.isArray(mod.modData.tags) ? mod.modData.tags : [];
		const tagsHtml = tags.length > 0 ? `<span class="badge text-bg-primary">${tags.join('</span><a> </a><span class="badge text-bg-primary">')}</span>` : '<span class="badge text-bg-secondary">No tags</span>';

		// Update the DOM elements
		document.getElementById("modDisplayModName").innerHTML = `${name}<a> </a><span class="badge text-bg-info">${version}</span><a> </a><span class="badge text-bg-warning">${author}</span>`;
		document.getElementById("modDisplayshortDescription").innerHTML = `${shortDescription}`;
		document.getElementById("modDisplayTags").innerHTML = tagsHtml;

		// Use marked.parse safely
		try {
			document.getElementById("modDisplayDescription").innerHTML = marked.parse(description);
		} catch (parseError) {
			console.error("Error parsing markdown:", parseError);
			document.getElementById("modDisplayDescription").innerHTML = description;
		}

		// Update mod display actions
		if (mod.modID) {
			await globalThis.UpdateModDisplayActions(mod.modID);

			// Fetch versions
			try {
				var response = await fetch(`/api/mods?modid=${mod.modID}&option=versions`);
				var result = await response.json();
				console.log("Response:", result);

				if (result.versions) {
					await globalThis.UpdateVersionsList(mod.modID, result.versions);
				} else {
					console.warn("No versions found for mod:", mod.modID);
				}
			} catch (versionError) {
				console.error("Error fetching versions:", versionError);
			}
		} else {
			console.error("Mod ID is missing, cannot update actions or fetch versions");
		}
	} catch (error) {
		console.error("Error in DisplayModApi:", error);
		document.getElementById("modDisplayDescription").innerHTML = "An error occurred while displaying mod details.";
	}
};
globalThis.GetModVersion = async function (modID, version) {
	try {
		// Check if modID and version are valid
		if (!modID) {
			console.error("Invalid mod ID provided to GetModVersion");
			alert("Error: Invalid mod ID");
			return;
		}

		if (!version || version === "Change Version") {
			console.warn("No version selected");
			return;
		}

		try {
			var response = await fetch(`/api/mods?modid=${modID}&option=info&version=${version}`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			var result = await response.json();
			console.log("Response:", result.mod);

			if (!result.mod) {
				console.error("API returned no mod data");
				alert("Error: Could not retrieve mod version data");
				return;
			}

			// Cache the mod data and display it
			globalThis.ModCache[result.mod.modID] = result.mod;
			await globalThis.DisplayModApi(globalThis.ModCache[result.mod.modID]);
		} catch (fetchError) {
			console.error("Error fetching mod version:", fetchError);
			alert("Failed to retrieve mod version. Please try again later.");
		}
	} catch (error) {
		console.error("Error in GetModVersion:", error);
		alert("An unexpected error occurred while retrieving the mod version.");
	}
};
globalThis.UpdateVersionsList = async function (modID, versions) {
	try {
		// Check if modID is valid
		if (!modID) {
			console.error("Invalid mod ID provided to UpdateVersionsList");
			return;
		}

		var versionSelection = document.getElementById("versionSelection");
		if (!versionSelection) {
			console.error("versionSelection element not found");
			return;
		}

		// Clear existing options except the first one (Change Version)
		while (versionSelection.options.length > 1) {
			versionSelection.remove(1);
		}

		// Check if versions is valid
		if (!versions || !Array.isArray(versions) || versions.length === 0) {
			console.warn(`No versions found for mod ${modID}`);
			var noVersionOption = document.createElement("option");
			noVersionOption.value = "";
			noVersionOption.innerHTML = "No versions available";
			noVersionOption.disabled = true;
			versionSelection.appendChild(noVersionOption);
			return;
		}

		console.log("Versions: " + JSON.stringify(versions));

		// Add each version as an option
		versions.forEach((version) => {
			if (version) {
				// Only add non-null/undefined versions
				var versionOption = document.createElement("option");
				versionOption.value = version;
				versionOption.innerHTML = version;
				versionSelection.appendChild(versionOption);
			}
		});
	} catch (error) {
		console.error("Error in UpdateVersionsList:", error);
	}
};
globalThis.UpdateModDisplayActions = async function (modID) {
	try {
		// Check if modID is valid
		if (!modID) {
			console.error("Invalid mod ID provided to UpdateModDisplayActions");
			return;
		}

		var modDisplayActions = document.getElementById("modDisplayActions");
		if (!modDisplayActions) {
			console.error("modDisplayActions element not found");
			return;
		}

		var mod = globalThis.Mods[modID];

		// Basic actions that don't require mod data
		var actionsHtml = `<div class="btn-group" role="group" style="padding-left: 15px;margin-top:5px; height: 40px;">
<button class="btn btn-primary" onclick='globalThis.DownloadMod("${modID}")'>Download</button>
<button class="btn btn-success" onclick="navigator.clipboard.writeText('${modID}')">Copy ID</button>
</div>
<select class="form-select" id="versionSelection" style="padding-left: 15px;margin-top:5px; height: 40px;width: 230px" onchange='globalThis.GetModVersion("${modID}",this.value)'>
<option selected>Change Version</option>
</select>`;

		// Admin actions that require mod data
		if (mod) {
			// Check if mod has Author property with discordID
			var authorId = mod.Author && mod.Author.discordID ? mod.Author.discordID : null;

			actionsHtml += `<div class="btn-group" role="group" style="padding-left: 15px;margin-top:5px; height: 40px;">
<button class="btn btn-success" onclick='globalThis.VerifyMod("${modID}")'>Verify</button>
<button class="btn btn-danger" onclick='globalThis.DenyMod("${modID}")'>Deny</button>`;

			// Only add Ban Author button if we have a valid author ID
			if (authorId) {
				actionsHtml += `<button class="btn btn-danger" onclick='globalThis.BanAuthor("${authorId}")'>Ban Author</button>`;
			}

			actionsHtml += `</div>`;
		} else {
			console.warn(`Mod with ID ${modID} not found in globalThis.Mods`);
		}

		modDisplayActions.innerHTML = actionsHtml;
	} catch (error) {
		console.error("Error in UpdateModDisplayActions:", error);
	}
};

// Download mod function
globalThis.DownloadMod = async function (modID) {
	try {
		// Check if modID is valid
		if (!modID) {
			console.error("Invalid mod ID provided to DownloadMod");
			alert("Error: Invalid mod ID");
			return;
		}

		var mod = globalThis.Mods[modID];
		if (!mod) {
			console.error(`Mod with ID ${modID} not found`);
			alert("Error: Mod not found");
			return;
		}

		// Make sure mod has required properties
		if (!mod.modID) {
			console.error("Mod is missing modID property");
			alert("Error: Invalid mod data");
			return;
		}

		try {
			var response = await fetch(`/api/mods?modid=${mod.modID}&option=download`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			var result = await response.blob();
			var url = window.URL.createObjectURL(new Blob([result]));
			var link = document.createElement("a");
			link.href = url;
			link.style.display = "none";

			// Use mod name if available, otherwise use mod ID
			var fileName = mod.modData && mod.modData.name ? `${mod.modData.name}.zip` : `mod-${mod.modID}.zip`;
			link.setAttribute("download", fileName);

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (fetchError) {
			console.error("Error downloading mod:", fetchError);
			alert("Failed to download mod. Please try again later.");
		}
	} catch (error) {
		console.error("Error in DownloadMod:", error);
		alert("An unexpected error occurred while downloading the mod.");
	}
};

// Admin action functions
globalThis.VerifyMod = async function (modID) {
	if (!confirm("Are you sure you want to verify this mod?")) {
		return;
	}

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/admin/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "verify",
				modID: modID,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("Mod verified successfully!");
		// Refresh the mod list to show the updated status
		await globalThis.PerformSearch();
	} catch (error) {
		console.error("Error verifying mod:", error);
		alert("An error occurred while verifying the mod.");
	}
};

globalThis.DenyMod = async function (modID) {
	if (!confirm("Are you sure you want to deny and delete this mod? This action cannot be undone.")) {
		return;
	}

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/admin/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "deny",
				modID: modID,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("Mod denied and deleted successfully!");
		// Refresh the mod list
		await globalThis.PerformSearch();
	} catch (error) {
		console.error("Error denying mod:", error);
		alert("An error occurred while denying the mod.");
	}
};

globalThis.BanAuthor = async function (authorID) {
	if (!confirm("Are you sure you want to ban this author? This will prevent them from uploading mods.")) {
		return;
	}

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/admin/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "banAuthor",
				authorID: authorID,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("Author banned successfully!");
	} catch (error) {
		console.error("Error banning author:", error);
		alert("An error occurred while banning the author.");
	}
};

// User Management Functions
globalThis.Users = {};
globalThis.UserCache = {};

globalThis.PerformUserSearch = async function () {
	var searchInput = document.getElementById("userSearchInput");
	var searchQuery = searchInput.value;
	var searchType = document.getElementById("userSearchType").value;

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "searchUsers",
				search: searchQuery,
			}),
		});
		var result = await response.json();

		if (result.error) {
			console.error("Error searching users:", result.error);
			alert("Error: " + result.error);
			return;
		}

		globalThis.Users = {};

		if (result.users && result.users.length > 0) {
			result.users.forEach((user) => {
				// Filter by search type if needed
				if (searchType === "admin" && !user.permissions.includes("admin")) {
					return;
				}
				if (searchType === "banned" && !user.banned) {
					return;
				}

				globalThis.Users[user.discordID] = user;
			});
		}
	} catch (e) {
		console.error("Error processing users:", e);
	}

	UpdateUserList();
};

globalThis.UpdateUserList = function () {
	var userList = document.getElementById("userList");
	var userItems = "";

	Object.values(globalThis.Users).forEach((user) => {
		var statusBadge = "";
		if (user.banned) {
			statusBadge = '<span class="badge bg-danger">Banned</span>';
		}
		if (user.permissions.includes("admin")) {
			statusBadge += ' <span class="badge bg-success">Admin</span>';
		}

		userItems += `<tr class="userListItem" onclick='globalThis.DisplayUser("${user.discordID}")'>
            <td>${user.discordUsername}</td>
            <td>${statusBadge}</td>
        </tr>`;
	});

	userList.innerHTML = `<table class="displayInner">
        <tr>
            <th width="300">Username</th>
            <th width="200">Status</th>
        </tr>
        ${userItems}
    </table>`;

	if (Object.values(globalThis.Users).length > 0) {
		globalThis.DisplayUser(Object.values(globalThis.Users)[0].discordID);
	}
};

globalThis.DisplayUser = async function (discordID) {
	var user = globalThis.Users[discordID];
	var userDisplay = document.getElementById("userDisplay");

	userDisplay.innerHTML = `<div class="displayInner">
        <h3 id="userDisplayName">${user.discordUsername}</h3>
        <p>Discord ID: <span id="userDiscordID">${user.discordID}</span></p>
        <p>Joined: ${new Date(user.joinedAt).toLocaleString()}</p>
        <p>Status: 
            <span id="userBanStatus" class="badge ${user.banned ? "bg-danger" : "bg-success"}">${user.banned ? "Banned" : "Active"}</span>
            <span id="userAdminStatus" class="badge ${user.permissions.includes("admin") ? "bg-success" : "bg-secondary"}">${user.permissions.includes("admin") ? "Admin" : "User"}</span>
        </p>
        <h4>User Stats</h4>
        <div id="userStats">
            <p>Loading stats...</p>
        </div>
    </div>`;

	// Get user stats
	if (globalThis.UserCache[discordID]) {
		await DisplayUserStats(globalThis.UserCache[discordID]);
	} else {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "getUserDetails",
				userID: discordID,
			}),
		});
		var result = await response.json();

		if (result.error) {
			console.error("Error getting user details:", result.error);
			alert("Error: " + result.error);
			return;
		}

		globalThis.UserCache[discordID] = result;
		await DisplayUserStats(result);
	}

	await UpdateUserDisplayActions(discordID);
};

globalThis.DisplayUserStats = async function (userData) {
	var userStats = document.getElementById("userStats");
	var stats = userData.stats;

	var modVersionsHtml = "";
	if (stats.modVersions && stats.modVersions.length > 0) {
		stats.modVersions.forEach((version) => {
			modVersionsHtml += `<tr>
                <td>${version.modName}</td>
                <td>${version.version}</td>
                <td>${new Date(version.uploadTime).toLocaleString()}</td>
            </tr>`;
		});
	}

	userStats.innerHTML = `
        <p>Mods Uploaded: ${stats.modsUploaded}</p>
        <p>Mod Versions Uploaded: ${stats.modVersionsUploaded}</p>
        ${
			stats.modVersionsUploaded > 0
				? `
        <h5>Mod Versions</h5>
        <table class="table table-sm">
            <thead>
                <tr>
                    <th>Mod Name</th>
                    <th>Version</th>
                    <th>Upload Time</th>
                </tr>
            </thead>
            <tbody>
                ${modVersionsHtml}
            </tbody>
        </table>
        `
				: ""
		}
    `;
};

globalThis.UpdateUserDisplayActions = async function (discordID) {
	var user = globalThis.Users[discordID];
	var userDisplayActions = document.getElementById("userDisplayActions");

	userDisplayActions.innerHTML = `
        <div class="btn-group" role="group" style="padding-left: 15px;margin-top:5px; height: 40px;">
            <button class="btn btn-success" onclick="navigator.clipboard.writeText('${discordID}')">Copy ID</button>
        </div>
        <div class="btn-group" role="group" style="padding-left: 15px;margin-top:5px; height: 40px;">
            ${user.banned ? `<button class="btn btn-success" onclick='globalThis.UnbanUser("${discordID}")'>Unban User</button>` : `<button class="btn btn-danger" onclick='globalThis.BanUser("${discordID}")'>Ban User</button>`}
            ${
				user.permissions.includes("admin")
					? `<button class="btn btn-warning" onclick='globalThis.RemoveAdmin("${discordID}")'>Remove Admin</button>`
					: `<button class="btn btn-primary" onclick='globalThis.SetAdmin("${discordID}")'>Set as Admin</button>`
			}
        </div>
    `;
};

globalThis.BanUser = async function (discordID) {
	if (!confirm("Are you sure you want to ban this user? This will prevent them from uploading mods.")) {
		return;
	}

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/admin/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "banAuthor",
				authorID: discordID,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("User banned successfully!");
		// Update the user in the cache
		globalThis.Users[discordID].banned = true;
		await globalThis.DisplayUser(discordID);
	} catch (error) {
		console.error("Error banning user:", error);
		alert("An error occurred while banning the user.");
	}
};

globalThis.UnbanUser = async function (discordID) {
	if (!confirm("Are you sure you want to unban this user?")) {
		return;
	}

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/admin/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "unbanUser",
				authorID: discordID,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("User unbanned successfully!");
		// Update the user in the cache
		globalThis.Users[discordID].banned = false;
		await globalThis.DisplayUser(discordID);
	} catch (error) {
		console.error("Error unbanning user:", error);
		alert("An error occurred while unbanning the user.");
	}
};

globalThis.SetAdmin = async function (discordID) {
	if (!confirm("Are you sure you want to set this user as an admin?")) {
		return;
	}

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/admin/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "setAdmin",
				authorID: discordID,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("User set as admin successfully!");
		// Update the user in the cache
		if (!globalThis.Users[discordID].permissions.includes("admin")) {
			globalThis.Users[discordID].permissions.push("admin");
		}
		await globalThis.DisplayUser(discordID);
	} catch (error) {
		console.error("Error setting admin:", error);
		alert("An error occurred while setting the user as admin.");
	}
};

globalThis.RemoveAdmin = async function (discordID) {
	if (!confirm("Are you sure you want to remove admin status from this user?")) {
		return;
	}

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/admin/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "removeAdmin",
				authorID: discordID,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("Admin status removed successfully!");
		// Update the user in the cache
		globalThis.Users[discordID].permissions = globalThis.Users[discordID].permissions.filter((p) => p !== "admin");
		await globalThis.DisplayUser(discordID);
	} catch (error) {
		console.error("Error removing admin:", error);
		alert("An error occurred while removing admin status.");
	}
};

// Site Actions Functions
globalThis.Actions = [];
globalThis.CurrentPage = 1;
globalThis.PageSize = 50;
globalThis.TotalPages = 1;

globalThis.LoadActions = async function (page = 1) {
	globalThis.CurrentPage = page;

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				page: page,
				size: globalThis.PageSize,
			}),
		});
		var result = await response.json();

		if (result.error) {
			console.error("Error loading actions:", result.error);
			alert("Error: " + result.error);
			return;
		}

		globalThis.Actions = result.actions;
		globalThis.TotalPages = result.pagination.totalPages;

		UpdateActionsList();
	} catch (error) {
		console.error("Error loading actions:", error);
	}
};

globalThis.UpdateActionsList = function () {
	var actionsList = document.getElementById("actionsList");
	var actionsItems = "";

	globalThis.Actions.forEach((action) => {
		actionsItems += `<tr>
            <td>${action.discordID}</td>
            <td>${action.action}</td>
            <td>${new Date(action.time).toLocaleString()}</td>
        </tr>`;
	});

	actionsList.innerHTML = `<table class="table table-striped">
        <thead>
            <tr>
                <th>User ID</th>
                <th>Action</th>
                <th>Time</th>
            </tr>
        </thead>
        <tbody>
            ${actionsItems}
        </tbody>
    </table>`;

	// Update pagination
	var pagination = document.getElementById("actionsPagination");
	var paginationHtml = "";

	// Previous button
	paginationHtml += `<li class="page-item ${globalThis.CurrentPage === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" onclick="globalThis.LoadActions(${globalThis.CurrentPage - 1}); return false;">Previous</a>
    </li>`;

	// Page numbers
	for (let i = Math.max(1, globalThis.CurrentPage - 2); i <= Math.min(globalThis.TotalPages, globalThis.CurrentPage + 2); i++) {
		paginationHtml += `<li class="page-item ${i === globalThis.CurrentPage ? "active" : ""}">
            <a class="page-link" href="#" onclick="globalThis.LoadActions(${i}); return false;">${i}</a>
        </li>`;
	}

	// Next button
	paginationHtml += `<li class="page-item ${globalThis.CurrentPage === globalThis.TotalPages ? "disabled" : ""}">
        <a class="page-link" href="#" onclick="globalThis.LoadActions(${globalThis.CurrentPage + 1}); return false;">Next</a>
    </li>`;

	pagination.innerHTML = paginationHtml;
};

// Banned Users Functions
globalThis.LoadBannedUsers = async function () {
	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "listUsers",
			}),
		});
		var result = await response.json();

		if (result.error) {
			console.error("Error loading banned users:", result.error);
			alert("Error: " + result.error);
			return;
		}

		// Filter for banned users
		var bannedUsers = result.users.filter((user) => user.banned);

		UpdateBannedUsersList(bannedUsers);
	} catch (error) {
		console.error("Error loading banned users:", error);
	}
};

globalThis.UpdateBannedUsersList = function (bannedUsers) {
	var bannedUsersList = document.getElementById("bannedUsersList");

	if (bannedUsers.length === 0) {
		bannedUsersList.innerHTML = "<p>No banned users found.</p>";
		return;
	}

	var bannedUsersItems = "";

	bannedUsers.forEach((user) => {
		bannedUsersItems += `<tr>
            <td>${user.discordUsername}</td>
            <td>${user.discordID}</td>
            <td>${new Date(user.joinedAt).toLocaleString()}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick='globalThis.UnbanUserFromList("${user.discordID}")'>Unban</button>
            </td>
        </tr>`;
	});

	bannedUsersList.innerHTML = `<table class="table table-striped">
        <thead>
            <tr>
                <th>Username</th>
                <th>Discord ID</th>
                <th>Joined At</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${bannedUsersItems}
        </tbody>
    </table>`;
};

globalThis.UnbanUserFromList = async function (discordID) {
	if (!confirm("Are you sure you want to unban this user?")) {
		return;
	}

	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/admin/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "unbanUser",
				authorID: discordID,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("User unbanned successfully!");
		// Reload the banned users list
		await globalThis.LoadBannedUsers();
	} catch (error) {
		console.error("Error unbanning user:", error);
		alert("An error occurred while unbanning the user.");
	}
};

// Config Functions
globalThis.LoadConfig = async function () {
	try {
		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/config", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				action: "getConfig",
			}),
		});
		var result = await response.json();

		if (result.error) {
			console.error("Error loading config:", result.error);
			alert("Error: " + result.error);
			return;
		}

		// Format the JSON for better readability
		var formattedConfig = JSON.stringify(JSON.parse(result.config), null, 2);

		// Set the editor content
		if (globalThis.configEditor) {
			globalThis.configEditor.setValue(formattedConfig);
		}
	} catch (error) {
		console.error("Error loading config:", error);
		if (globalThis.configEditor) {
			globalThis.configEditor.setValue("// Error loading config: " + error.message);
		}
	}
};

globalThis.SaveConfig = async function () {
	if (!confirm("Are you sure you want to save changes to the config file? This could affect the site's functionality.")) {
		return;
	}

	try {
		var configContent = globalThis.configEditor.getValue();

		// Validate JSON
		try {
			JSON.parse(configContent);
		} catch (e) {
			alert("Invalid JSON format: " + e.message);
			return;
		}

		var discordUser = JSON.parse(localStorage.getItem("discordUser"));
		var response = await fetch("/api/config", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				discordUser: discordUser,
				config: configContent,
			}),
		});

		var result = await response.json();
		if (result.error) {
			alert("Error: " + result.error);
			return;
		}

		alert("Config saved successfully! You may need to restart the server for some changes to take effect.");
	} catch (error) {
		console.error("Error saving config:", error);
		alert("An error occurred while saving the config: " + error.message);
	}
};
