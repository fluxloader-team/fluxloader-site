console.log("admin page loaded");
var styleContainer = document.getElementById('styleContainer');
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
globalThis.UpdatePageStyle = function(style) {
    globalThis.PageStyle = `
    ${BaseStyle}
    ${style}
`
    styleContainer.textContent = PageStyle;
}
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
    }`)
globalThis.adminPageData = document.getElementById('adminPageData');
globalThis.Pages = {
    "Selection": {
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
        }
    },
    "ModManagement": {
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
    }`)
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
            var response = await fetch(`/api/mods?search=${globalThis.SearchQuery}&verified=${verifiedOnly}`);
            var result = await response.json();
            console.log(result.mods);
            globalThis.Mods = {}
            result.mods.forEach((mod) => {
                globalThis.Mods[mod.modID] = mod
            })
            console.log("Response:", result.mods);
            UpdateModList()
        }
    }
}
globalThis.Pages.Selection.action();

globalThis.SearchQuery = "";
globalThis.UpdateModList = function() {
    var modList = document.getElementById("modList");
    var modItems = "";
    Object.values(globalThis.Mods).forEach((mod) => {
        modItems += `<tr class="modListItem" onclick='globalThis.DisplayMod("${mod.modID}")'><td>${mod.modData.name}</td><td>${mod.modData.author}</td><td>${mod.modData.version}</td></tr>`

    })
    modList.innerHTML = `<table class="displayInner"><tr><th width="200">Name</th><th width="200">Author</th><th width="100">Version</th></tr> ${modItems}`;
    modList.innerHTML += "</table>";
    globalThis.DisplayMod(Object.values(globalThis.Mods)[0].modID)
}
globalThis.PerformSearch = async function() {
    var searchInput = document.getElementById("searchInput");
    globalThis.SearchQuery = searchInput.value;
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
    var response = await fetch(`/api/mods?search=${globalThis.SearchQuery}&verified=${verifiedOnly}`);
    var result = await response.json();
    console.log(result.mods);
    globalThis.Mods = {}
    try{
        result.mods.forEach((mod) => {
            globalThis.Mods[mod.modID] = mod
        })
    }catch(e){

    }
    console.log("Response:", result.mods);
    UpdateModList()
}
globalThis.DisplayMod = async function (modID) {
    var mod = globalThis.Mods[modID]
    var modDisplay = document.getElementById("modDisplay");
    modDisplay.innerHTML = `<div class="displayInner">
<h3 id="modDisplayModName">${mod.modData.name}<a> </a><span class="badge text-bg-info">${mod.modData.version}</span><a> </a><span class="badge text-bg-warning">${mod.modData.author}</span></h3>
<h6 id="modDisplayshortDescription">${mod.modData.shortDescription}</h6>
<h6 id="modDisplayTags"><span class="badge text-bg-primary">${mod.modData.tags.join("</span><a> </a><span class=\"badge text-bg-primary\">")}</span></h6>
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
</div>`
    var dependenciesList = document.getElementById("dependencies");
    var dependencies = "";
    Object.keys(mod.modData.dependencies).forEach((dependency) => {
        dependencies += `<tr><td>${dependency}</td><td>${mod.modData.dependencies[dependency]}</td></tr>`

    })
    dependenciesList.innerHTML = `<table><tr><th style="width: 250px">Name</th><th style="width: 250px">Version</th></tr> ${dependencies}`;
    dependenciesList.innerHTML += "</table>";
    if (globalThis.ModCache[mod.modID]){
        await globalThis.DisplayModApi(globalThis.ModCache[mod.modID]);
    }else{
        var response = await fetch(`/api/mods?modid=${mod.modID}&option=info`);
        var result = await response.json();
        console.log("Response:", result.mod);
        globalThis.ModCache[result.mod.modID] = result.mod
        await globalThis.DisplayModApi(globalThis.ModCache[result.mod.modID]);
    }
}
globalThis.ModCache = {}
globalThis.DisplayModApi = async function (mod) {
    document.getElementById("modDisplayModName").innerHTML = `${mod.modData.name}<a> </a><span class="badge text-bg-info">${mod.modData.version}</span><a> </a><span class="badge text-bg-warning">${mod.modData.author}</span>`;
    document.getElementById("modDisplayshortDescription").innerHTML = `${mod.modData.shortDescription}`;
    document.getElementById("modDisplayTags").innerHTML = `<span class="badge text-bg-primary">${mod.modData.tags.join("</span><a> </a><span class=\"badge text-bg-primary\">")}</span>`;
    document.getElementById("modDisplayDescription").innerHTML = `${marked.parse(mod.modData.description)}`

    await globalThis.UpdateModDisplayActions(mod.modID)
    var response = await fetch(`/api/mods?modid=${mod.modID}&option=versions`);
    var result = await response.json();
    console.log("Response:", result);
    await globalThis.UpdateVersionsList(mod.modID,result.versions);
}
globalThis.GetModVersion = async function (modID, version) {
    var response = await fetch(`/api/mods?modid=${modID}&option=info&version=${version}`);
    var result = await response.json();
    console.log("Response:", result.mod);
    globalThis.ModCache[result.mod.modID] = result.mod
    await globalThis.DisplayModApi(globalThis.ModCache[result.mod.modID]);
}
globalThis.UpdateVersionsList = async function (modID,versions){
    var versionSelection = document.getElementById("versionSelection");
    console.log("Versions: " + JSON.stringify(versions));
    versions.forEach((version) => {
        var versionOption = document.createElement("option");
        versionOption.value = version;
        versionOption.innerHTML = version;
        versionSelection.appendChild(versionOption);
    });
}
globalThis.UpdateModDisplayActions = async function (modID) {
    var mod = globalThis.Mods[modID]
    var modDisplayActions = document.getElementById("modDisplayActions");
    modDisplayActions.innerHTML =`<div class="btn-group" role="group" style="padding-left: 15px;margin-top:5px; height: 40px;">
<button class="btn btn-primary" onclick='globalThis.DownloadMod("${modID}")'>Download</button>
<button class="btn btn-success" onclick="navigator.clipboard.writeText('${modID}')">Copy ID</button>
</div>
<select class="form-select" id="versionSelection" style="padding-left: 15px;margin-top:5px; height: 40px;width: 230px" onchange='globalThis.GetModVersion("${modID}",this.value)'>
<option selected>Change Version</option>
</select>
<div class="btn-group" role="group" style="padding-left: 15px;margin-top:5px; height: 40px;">
<button class="btn btn-success" onclick="">Verify</button>
<button class="btn btn-danger" onclick=''>Deny</button>
<button class="btn btn-danger" onclick=''>Ban Author</button>
</div>`
}