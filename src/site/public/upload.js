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

	const rightContainer = document.getElementById("rightContainer");
	rightContainer.removeChild(document.getElementById("discordLogin"));
	rightContainer.appendChild(discordDropdown);

	const logoutButton = document.getElementById("logoutButton");
	logoutButton.addEventListener("click", function () {
		localStorage.removeItem("discordUser");
		window.location.reload();
	});
}

let currentModData = null;

async function performUpload() {
	var fileInput = document.getElementById("ModFile");
	var file = fileInput.files[0];

	if (!file || (file.type !== "application/zip" && file.type !== "application/x-zip-compressed")) {
		showError("Please upload a valid ZIP file.");
		return;
	}

	try {
		function arrayBufferToBase64(buffer) {
			const byteArray = new Uint8Array(buffer);
			return window.btoa(byteArray.reduce((data, byte) => data + String.fromCharCode(byte), ""));
		}

		const zipBinaryData = await file.arrayBuffer();
		const base64Data = arrayBufferToBase64(zipBinaryData);
		const jsonPayload = JSON.stringify({
			filename: file.name,
			filedata: base64Data,
			discordInfo: discordUser,
		});

		console.log("upload.html:");
		console.log(file.name);
		console.log(jsonPayload);

		document.getElementById("uploadButton").disabled = true;
		document.getElementById("uploadButton").innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';

		var response = await fetch("/api/uploadmod", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: jsonPayload,
		});

		var result = await response.json();
		console.log("Server response:", result);

		document.getElementById("uploadButton").disabled = false;
		document.getElementById("uploadButton").innerHTML = "Upload Mod";

		if (result.message) {
			if (result.isUpdate) {
				// Show update success message
				showSuccess(`Update Successful: Your mod has been updated.`);
			} else {
				// Show new upload success message
				showSuccess(`Upload Successful: ${result.message}`);
			}
		} else if (result.error) {
			// Show error message
			showError(result.error);
		}
	} catch (error) {
		console.error("Error processing ZIP file:", error);
		document.getElementById("uploadButton").disabled = false;
		document.getElementById("uploadButton").innerHTML = "Upload Mod";
		showError("Error processing the ZIP file: " + (error.message || "Unknown error"));
	}
}

function showError(message) {
	const errorDiv = document.createElement("div");
	errorDiv.className = "alert alert-danger alert-dismissible fade show mt-3";
	errorDiv.innerHTML = `
				<strong>Error:</strong> ${message}
				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
			`;
	document.querySelector(".modUploadForm").prepend(errorDiv);

	// Auto-dismiss after 5 seconds
	setTimeout(() => {
		errorDiv.classList.remove("show");
		setTimeout(() => errorDiv.remove(), 500);
	}, 5000);
}

function showSuccess(message) {
	const successDiv = document.createElement("div");
	successDiv.className = "alert alert-success alert-dismissible fade show mt-3";
	successDiv.innerHTML = `
				<strong>Success:</strong> ${message}
				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
			`;
	document.querySelector(".modUploadForm").prepend(successDiv);

	// Auto-dismiss after 5 seconds
	setTimeout(() => {
		successDiv.classList.remove("show");
		setTimeout(() => successDiv.remove(), 500);
	}, 5000);
}

async function handleUpload() {
	if (!currentModData || !currentModData.modID) {
		showError("No valid mod selected or missing modID in modinfo.json");
		return;
	}

	// Proceed with upload - server will handle if it's an update
	await performUpload();
}

function displayModData(modData) {
	// Store the current mod data in the global variable
	currentModData = modData;

	// Check if modID is defined
	const modIDStatus = modData.modID ? `<span class="badge bg-success">ModID: ${modData.modID}</span>` : `<span class="badge bg-danger">Missing ModID!</span>`;

	var container = document.getElementById("ModInfo");
	container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h4>${modData.name} <small class="text-muted">v${modData.version}</small></h4>
        <div class="mb-2">
          ${modIDStatus}
          <span class="badge bg-primary" style="margin-left: 10px;">Author: ${modData.author}</span>
        </div>
        ${modData.tags && modData.tags.length ? modData.tags.map((tag) => `<span class="badge bg-secondary">${tag}</span>`).join(" ") : ""}
      </div>
      <div class="card-body">
        <h5>Short Description</h5>
        <p class="text-muted">${modData.shortDescription || "No short description provided."}</p>
        <h5>Description</h5>
        <div>${modData.description ? marked.parse(modData.description) : "<em>No description provided.</em>"}</div>

        <hr>

        <h5>Details</h5>
        <table class="table table-striped">
          <tbody>
            <tr>
              <th scope="row">Mod ID</th>
              <td>${modData.modID || '<span class="text-danger">Missing! A unique modID is required.</span>'}</td>
            </tr>
            <tr>
              <th scope="row">Fluxloader Version</th>
              <td>${modData.fluxloaderVersion || "N/A"}</td>
            </tr>
            <tr>
              <th scope="row">Electron Entrypoint</th>
              <td>${modData.electronEntrypoint || "N/A"}</td>
            </tr>
            <tr>
              <th scope="row">Game Entrypoint</th>
              <td>${modData.gameEntrypoint || "N/A"}</td>
            </tr>
            <tr>
              <th scope="row">Worker Entrypoint</th>
              <td>${modData.workerEntrypoint || "N/A"}</td>
            </tr>
            <tr>
              <th scope="row">Dependencies</th>
              <td>
                ${
					modData.dependencies && Object.keys(modData.dependencies).length
						? Object.entries(modData.dependencies)
								.map(([key, value]) => `<span class="badge bg-info">${key}: ${value}</span>`)
								.join(" ")
						: "<em>No dependencies.</em>"
				}
              </td>
            </tr>
          </tbody>
        </table>

        <hr>

        <h5>Configuration Schema</h5>
        <pre class="p-3 rounded">${modData.configSchema ? JSON.stringify(modData.configSchema, null, 2) : "No configuration schema available."}</pre>
      </div>
    </div>
  `;
}

document.getElementById("ModFile").addEventListener("change", async function (event) {
	var file = event.target.files[0];
	if (!file) {
		alert("No file selected!");
		return;
	}

	if (!file.name.endsWith(".zip")) {
		alert("Please upload a valid ZIP file.");
		return;
	}

	var zip = new JSZip();
	var zipFileContent = await file.arrayBuffer();

	try {
		var content = await zip.loadAsync(zipFileContent);

		var fileNames = Object.keys(content.files);

		// Load the README.md file
		var readmePath = fileNames.find((path) => path.endsWith("README.md"));
		var description;
		if (readmePath) {
			var readmeFile = await content.file(readmePath);
			description = await readmeFile.async("text");
		}

		// Load the modinfo
		var modInfoPath = fileNames.find((path) => path.endsWith("modinfo.json"));
		if (!modInfoPath) {
			alert("No modinfo.json found in the ZIP file!");
			return;
		}
		var modInfoFile = await content.file(modInfoPath);
		var modInfoContent = await modInfoFile.async("text");
		var modInfo = await JSON.parse(modInfoContent);

		// Add extra information to modinfo to create moddata
		var modData = {
			...modInfo,
			description: description,
		};

		displayModData(modData);
	} catch (error) {
		console.error("Error processing the ZIP file:", error);
		alert("Could not process the ZIP file.");
	}
});
