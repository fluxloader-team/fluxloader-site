globalThis.pageGet = 1;
globalThis.mods = {};
globalThis.modCache = {};
globalThis.searchQuery = "";
globalThis.searching = false;

const modList = document.getElementById("modList");

globalThis.buildSearchQuery = function (searchText) {
	if (!searchText || searchText.trim() === "") {
		return JSON.stringify({ "modData.name": { $regex: "", $options: "i" } });
	}

	var query = { $and: [] };
	var terms = searchText.trim().split(" ");
	var tags = [];
	var nonTagTerms = [];

	terms.forEach((term) => {
		if (term.startsWith("#")) {
			tags.push(term.substring(1).toLowerCase());
		} else if (term.trim()) {
			nonTagTerms.push(term);
		}
	});

	if (tags.length > 0) {
		query.$and.push({
			"modData.tags": {
				$all: tags,
			},
		});
	}

	if (nonTagTerms.length > 0) {
		var searchString = nonTagTerms.join(" ");
		var nameAuthorSearch = {
			$or: [{ "modData.name": { $regex: searchString, $options: "i" } }, { "modData.author": { $regex: searchString, $options: "i" } }, { "modData.shortDescription": { $regex: searchString, $options: "i" } }],
		};
		query.$and.push(nameAuthorSearch);
	}

	if (query.$and.length === 0) {
		return JSON.stringify({ "modData.name": { $regex: "", $options: "i" } });
	}

	return JSON.stringify(query);
};

globalThis.performSearch = async function (pageToget = 1, perPage = 5000) {
	if (globalThis.searching === true) {
		return;
	}
	globalThis.searching = true;
	console.log("Performing search for:", globalThis.searchQuery);
	try {
		var searchInput = document.getElementById("searchInput");
		var searchText = searchInput.value;
		globalThis.searchQuery = searchText;

		var queryJson = globalThis.buildSearchQuery(searchText);
		var encodedQuery = encodeURIComponent(queryJson);

		var modList = document.getElementById("modList");
		if (pageToget === 1) {
			modList.innerHTML = `
							<div class="d-flex justify-content-center">
								<div class="spinner-border" role="status">
									<span class="visually-hidden">Searching...</span>
								</div>
							</div>
						`;
		}

		var response = await fetch(`/api/mods?search=${encodedQuery}&verified=null&size=${perPage}&page=${pageToget}`);
		var result = await response.json();
		if (pageToget === 1) {
			globalThis.mods = {};
		}
		if (result.error) {
			console.error("Search error:", result.error);
			if (pageToget === 1) {
				modList.innerHTML = `<div class="alert alert-danger">Search error: ${result.error}</div>`;
			} else {
				document.getElementById("modListTable").innerHTML += `
							<tr>
								<td colspan="4">Search error: ${result.error}</td>
							</tr>
							`;
			}
			globalThis.searching = false;
			return;
		}

		if (!result.mods || result.mods.length === 0) {
			if (pageToget === 1) {
				modList.innerHTML = `<div class="alert alert-info">No mods found matching your search.</div>`;
			} else {
				document.getElementById("modListTable").innerHTML += `
							<tr>
								<td colspan="4">All mods loaded</td>
							</tr>
							`;
			}
			globalThis.searching = false;
			return;
		}

		result.mods.forEach((mod) => {
			globalThis.mods[mod.modID] = mod;
		});

		if (searchText.trim() === "") {
			console.log(`Loaded all ${result.mods.length} mods`);
		} else {
			console.log(`Found ${result.mods.length} mods in search`);
		}

		updateModList(pageToget);
	} catch (error) {
		console.error("Search failed:", error);
		var modList = document.getElementById("modList");
		modList.innerHTML = `<div class="alert alert-danger">Error performing search. Please try again.</div>`;
	}
};

globalThis.downloadMod = async function (modID) {
	var mod = globalThis.mods[modID];
	console.log(`Downloading mod: ${JSON.stringify(mod)}`);
	var response = await fetch(`/api/mods?modid=${mod.modID}&option=download`);
	var result = await response.blob();
	var url = window.URL.createObjectURL(new Blob([result]));
	var link = document.createElement("a");
	link.href = url;
	link.style.display = "none";
	link.setAttribute("download", `${mod.modData.modID}.zip`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};

globalThis.updateModDisplayActions = async function (modID) {
	var mod = globalThis.mods[modID];
	var modDisplayActions = document.getElementById("modDisplayActions");
	modDisplayActions.innerHTML = `
						<div class="btn-group" role="group" style="padding-left: 15px;margin-top:5px; height: 40px;">
							<button class="btn btn-primary" onclick='globalThis.downloadMod("${modID}")'>Download</button>
							<button class="btn btn-success" onclick="navigator.clipboard.writeText('${modID}')">Copy ID</button>
						</div>
						<select class="form-select" id="versionSelection" style="padding-left: 15px;margin-top:5px; height: 40px;width: 230px" onchange='globalThis.getModVersion("${modID}",this.value)'>
							<option selected>Change Version</option>
						</select>`;
};

globalThis.displayMod = async function (modID) {
	var mod = globalThis.mods[modID];
	var modDisplay = document.getElementById("modDisplay");
	modDisplay.innerHTML = `
						<div class="displayInner">
							<h3 id="modDisplayModName">${mod.modData.name}
								<span class="badge text-bg-info">${mod.modData.version}</span><a> </a><span class="badge text-bg-warning">${mod.modData.author}</span>
							</h3>
							<h6 id="modDisplayshortDescription">${mod.modData.shortDescription}</h6>
							<h6 id="modDisplayTags"><span class="badge text-bg-primary">${mod.modData.tags.join('</span><a> </a><span class="badge text-bg-primary">')}</span></h6>
							<br>
							<h5>Dependencies</h5>
							<div id="dependencies"></div>
							<br>
							<h5>Mod Readme file</h5>
							<hr>
							<p id="modDisplayDescription"></p>
							<h6></h6>
						</div>`;
	var dependenciesList = document.getElementById("dependencies");
	var dependencies = "";
	if (mod.modData.dependencies) {
		Object.keys(mod.modData.dependencies).forEach((dependency) => {
			dependencies += `<tr><td>${dependency}</td><td>${mod.modData.dependencies[dependency]}</td></tr>`;
		});
	}
	dependenciesList.innerHTML = `<table><tr><th style="width: 250px">Name</th><th style="width: 250px">Version</th></tr> ${dependencies}`;
	dependenciesList.innerHTML += "</table>";
	if (globalThis.modCache[mod.modID]) {
		await globalThis.displayModAPI(globalThis.modCache[mod.modID]);
	} else {
		var response = await fetch(`/api/mods?modid=${mod.modID}&option=info`);
		var result = await response.json();
		console.log("Response:", result.mod);
		globalThis.modCache[result.mod.modID] = result.mod;
		await globalThis.displayModAPI(globalThis.modCache[result.mod.modID]);
	}
};

globalThis.displayModAPI = async function (mod) {
	document.getElementById("modDisplayModName").innerHTML = `${mod.modData.name}<a> </a><span class="badge text-bg-info">${mod.modData.version}</span><a> </a><span class="badge text-bg-warning">${mod.modData.author}</span>`;
	document.getElementById("modDisplayshortDescription").innerHTML = `${mod.modData.shortDescription}`;
	document.getElementById("modDisplayTags").innerHTML = `<span class="badge text-bg-primary">${mod.modData.tags.join('</span><a> </a><span class="badge text-bg-primary">')}</span>`;
	document.getElementById("modDisplayDescription").innerHTML = `${marked.parse(mod.modData.description)}`;

	await globalThis.updateModDisplayActions(mod.modID);
	var response = await fetch(`/api/mods?modid=${mod.modID}&option=versions`);
	var result = await response.json();
	console.log("Response:", result);
	await globalThis.updateVersionsList(mod.modID, result.versions);
};

globalThis.getModVersion = async function (modID, version) {
	var response = await fetch(`/api/mods?modid=${modID}&option=info&version=${version}`);
	var result = await response.json();
	console.log("Response:", result.mod);
	globalThis.modCache[result.mod.modID] = result.mod;
	await globalThis.displayModAPI(globalThis.modCache[result.mod.modID]);
};

globalThis.updateVersionsList = async function (modID, versions) {
	var versionSelection = document.getElementById("versionSelection");
	console.log("Versions: " + JSON.stringify(versions));
	versions.forEach((version) => {
		var versionOption = document.createElement("option");
		versionOption.value = version;
		versionOption.innerHTML = version;
		versionSelection.appendChild(versionOption);
	});
};

globalThis.updateModList = function (onPage = 1) {
	var modList = document.getElementById("modList");
	var modItems = "";
	var mods = Object.values(globalThis.mods);

	if (mods.length === 0) {
		if (onPage === 1) {
			modList.innerHTML = `<div class="alert alert-info">No mods found matching your search criteria.</div>`;
			document.getElementById("modDisplay").innerHTML = `
							<div class="alert alert-secondary">
								<h4>No mod selected</h4>
								<p>Search for mods using the search box above.</p>
								<p>
									<strong>Search tips:</strong><br>
									• Enter text to search by name or author<br>
									• Use #tag to find mods with specific tags<br>
									• Combine multiple tags like #gameplay #multiplayer to find mods with all tags
								</p>
							</div>
						`;
			document.getElementById("modDisplayActions").innerHTML = "";
		} else {
			document.getElementById("modListTable").innerHTML += `
							<tr>
								<td colspan="4">No more mods to load.</td>
							</tr>
							`;
		}
		globalThis.searching = false;
		return;
	}

	mods.forEach((mod) => {
		var tagList = mod.modData.tags && mod.modData.tags.length > 0 ? mod.modData.tags.slice(0, Math.min(mod.modData.tags.length, 4)).join('</span><a> </a><span class="badge text-bg-secondary">') : "";

		modItems += `<tr class="modListItem" onclick='globalThis.displayMod("${mod.modID}")'>
							<td>${mod.modData.name}</td>
							<td>${mod.modData.author}</td>
							<td>${mod.modData.version}</td>
							<td><span class="badge text-bg-secondary">${tagList}</span></td>
						</tr>`;
	});
	modList.innerHTML = `
						<table class="displayInner" id="modListTable">
							<tr>
								<th>Name</th>
								<th>Author</th>
								<th>Version</th>
								<th>Tags</th>
							</tr>
							${modItems}
						</table>
					`;
	if (onPage === 1) {
		globalThis.displayMod(mods[0].modID);
	}
	globalThis.searching = false;
};

modList.addEventListener("scroll", () => {
	var isAtBottom = modList.scrollHeight - modList.scrollTop === modList.clientHeight;
	if (isAtBottom) {
		globalThis.performSearch(globalThis.pageGet++);
	}
});

document.addEventListener("DOMContentLoaded", async () => {
	if (globalThis.searching === true) {
		return;
	}

	globalThis.searching = true;
	try {
		var encodedQuery = encodeURIComponent(JSON.stringify({ "modData.name": { $regex: "", $options: "i" } }));
		var response = await fetch(`/api/mods?search=${encodedQuery}&verified=null&size=5000&page=1`);
		var result = await response.json();

		globalThis.mods = {};

		if (result.error) {
			console.error("Error loading initial mods:", result.error);
			var modList = document.getElementById("modList");
			modList.innerHTML = `<div class="alert alert-danger">Error loading mods: ${result.error}</div>`;
			return;
		}

		if (!result.mods || result.mods.length === 0) {
			var modList = document.getElementById("modList");
			modList.innerHTML = `<div class="alert alert-info">No mods found in the database.</div>`;
			return;
		}

		result.mods.forEach((mod) => {
			globalThis.mods[mod.modID] = mod;
		});

		console.log(`Loaded ${result.mods.length} mods`);
		updateModList();

		document.getElementById("searchInput").addEventListener("keypress", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
				globalThis.performSearch();
			}
		});
	} catch (error) {
		console.error("Failed to load initial mods:", error);
		var modList = document.getElementById("modList");
		modList.innerHTML = `<div class="alert alert-danger">Error loading mods. Please refresh the page to try again.</div>`;
	}
});
