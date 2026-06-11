Vvveb.ComponentsGroup['Custom'] =
[];

let stNavbarExtended = false;

stAjaxCall("getComponents").then((components) => {
	processComponents(components);

	// we need to reload the control groups
	Vvveb.Builder.loadControlGroups();
});

function processComponents(components) {

	// check we have components
	if (components) {

		// find any components that are forms
		for (const key in components) {
			if (!components.hasOwnProperty(key)) continue;
			var component = components[key];

			// check if this is a form
			if (key.startsWith('form-') && component && component.name && component.value) {
				st_forms[component.name] = component.value;

				// remove the form from the components list
				delete components[key];
			}
		}

		// loop through each component
		for (const key in components) {
			if (!components.hasOwnProperty(key)) continue;
			var component = components[key];
			if (component && component.name && component.html && component.type) {

				// set the properties
				var properties = component.properties || [];

				// check if this is a websiteform type
				if (component.type === 'websiteform'
					&& Object.keys(st_forms).length > 0
				) {

					// build the select options
					var options = [];
					for (const formName in st_forms) {
						if (!st_forms.hasOwnProperty(formName)) continue;
						options.push({
							value: st_forms[formName],
							text: formName
						});
					}

					// loop through the properties to find "Form*"
					for (const key in properties) {
						if (properties[key].name && properties[key].name == 'Form*') {

							// set the input type to select
							properties[key].data = {
								options: options
							};
						}
					}
				}

				if(properties.length) {
					for (var i = 0; i < properties.length; i++) {

						// check we have an input type
						if (!properties[i].inputtype) {
							console.warn('No input type defined for property:', property);
							return;
						}

						// check the type
						switch (properties[i].inputtype) {
							case 'text':
							case 'alnum':
							case 'number':
								properties[i].inputtype = TextInput;
								break;
							case "textarea":
							case "small-wysiwyg":
							case "wysiwyg":
								properties[i].inputtype = TextareaInput;
								break;
							case 'select':
								properties[i].inputtype = SelectInput;
								break;
							default:
								properties[i].inputtype = TextInput;
								console.warn('Invalid input type:', properties[i]);
								break;
						}
					}
				}
				component.properties = properties;

				// register the component
				registerComponent(component);
			} else {
				console.debug('Invalid components format:', component);
			}
		}
	}
}

function registerComponent(component) {
	Vvveb.ComponentsGroup['Custom'].push("custom/" + component.type);
	Vvveb.Components.add("custom/" + component.type, {
		image: component.image || "icons/six-ticks.png",
		name: component.name,
		html: component.html,
		properties: component.properties || [],
		classes: component.classes || ["st-website-block"],
		init: function (node) {
			componentInit(component, node);
		},
		afterDrop: function (node) {
			componentAfterDrop(component, node);
		},
		onChange: function (node, property, value) {
			componentOnChange(component, node, property, value);
		},
		custom: true
	});

	if (!stNavbarExtended) {
		extendNavbarComponent();
		stNavbarExtended = true;
	}
}

function extendNavbarComponent() {
	Vvveb.Components.extend("_base", "html/navbar", {
		properties: [
		{
			name: "Links",
			key: "links",
			inputtype: ButtonInput,
			data: {
				text: "Manage links",
				icon: "la-link"
			},
			onChange: function(element) {
				stNavbarLinksManager.open(element);
				return element;
			}
		},
		{
			name: "Placement",
			key: "placement",
			htmlAttr: "class",
			validValues: ["fixed-top", "fixed-bottom", "sticky-top"],
			inputtype: SelectInput,
			data: {
				options: [{
					value: "",
					text: "Default"
				},{
					value: "fixed-top",
					text: "Fixed Top"
				},{
					value: "fixed-bottom",
					text: "Fixed Bottom"
				},{
					value: "sticky-top",
					text: "Sticky top"
				}]
			}
		}],
		custom: true
	});
}

const stNavbarLinksManager = {
	modalId: "st-navbar-links-modal",
	selectedValues: [],
	pageLookup: {},
	activeNode: null,
	treeSelect: null,
	items: [],
	itemSeq: 1,
	styleDefaults: {
		navListClass: "navbar-nav me-auto mb-2 mb-lg-0",
		linkLiClass: "nav-item",
		linkAClass: "nav-link",
		dropdownLiClass: "nav-item dropdown",
		dropdownToggleClass: "nav-link dropdown-toggle",
		dropdownMenuClass: "dropdown-menu",
		dropdownItemClass: "dropdown-item"
	},

	open: async function(node) {
		if (!node) {
			return;
		}

		this.activeNode = node;
		this.items = this.parseNavbar(node);
		this.ensureModal();
		this.renderItemsEditor();

		const modalEl = document.getElementById(this.modalId);
		const treeContainer = modalEl.querySelector(".st-navbar-tree");
		const status = modalEl.querySelector(".st-navbar-status");

		treeContainer.innerHTML = "";
		status.textContent = "Loading pages...";

		const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
		modal.show();

		try {
			const response = await stAjaxCall("getPages", { type: "page" }, "GET");
			const treeData = this.buildTreeData(response || {});
			const selected = this.getSelectedValuesFromItems(this.items, treeData.lookup);

			this.pageLookup = treeData.lookup;
			this.selectedValues = selected;

			this.treeSelect = new Treeselect({
				parentHtmlContainer: treeContainer,
				value: selected,
				options: treeData.options,
				isSingleSelect: false,
				placeholder: "Select pages to include",
				searchable: true,
				disabledBranchNodes: true,
				inputCallback: (selectedValue) => {
					if (Array.isArray(selectedValue)) {
						this.selectedValues = selectedValue;
					} else if (selectedValue) {
						this.selectedValues = [selectedValue];
					} else {
						this.selectedValues = [];
					}
				}
			});

			status.textContent = "";
		} catch (error) {
			status.textContent = "Unable to load pages.";
			displayToast("bg-danger", "Error", "Could not load pages for navbar links.");
		}
	},

	ensureModal: function() {
		if (document.getElementById(this.modalId)) {
			return;
		}

		const modal = document.createElement("div");
		modal.className = "modal fade";
		modal.id = this.modalId;
		modal.setAttribute("tabindex", "-1");
		modal.setAttribute("role", "dialog");
		modal.innerHTML = `
			<div class="modal-dialog modal-lg" role="document">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Navbar links</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<div class="row g-3">
							<div class="col-md-5">
								<div class="st-navbar-status small text-muted mb-2"></div>
								<div class="st-navbar-tree mb-2"></div>
								<div class="d-flex gap-2 flex-wrap">
									<button type="button" class="btn btn-outline-primary btn-sm st-navbar-add-pages">Add selected pages</button>
									<button type="button" class="btn btn-outline-secondary btn-sm st-navbar-add-custom">Add custom link</button>
									<button type="button" class="btn btn-outline-secondary btn-sm st-navbar-add-dropdown">Add dropdown</button>
								</div>
							</div>
							<div class="col-md-7">
								<div class="st-navbar-items border rounded p-2" style="min-height: 280px; max-height: 420px; overflow:auto"></div>
							</div>
						</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
						<button type="button" class="btn btn-primary st-navbar-save-links">Save links</button>
					</div>
				</div>
			</div>
		`;

		document.body.appendChild(modal);

		modal.querySelector(".st-navbar-add-pages").addEventListener("click", () => {
			this.addSelectedPages();
		});

		modal.querySelector(".st-navbar-add-custom").addEventListener("click", () => {
			this.items.push(this.createItem({ type: "link", label: "Custom link", url: "#", parentId: null }));
			this.renderItemsEditor();
		});

		modal.querySelector(".st-navbar-add-dropdown").addEventListener("click", () => {
			this.items.push(this.createItem({ type: "dropdown", label: "Dropdown", url: "", parentId: null }));
			this.renderItemsEditor();
		});

		modal.querySelector(".st-navbar-save-links").addEventListener("click", () => {
			this.applyItemsToNavbar();
			bootstrap.Modal.getOrCreateInstance(modal).hide();
		});

		modal.addEventListener("hidden.bs.modal", () => {
			const treeContainer = modal.querySelector(".st-navbar-tree");
			treeContainer.innerHTML = "";
			const listContainer = modal.querySelector(".st-navbar-items");
			listContainer.innerHTML = "";
			this.treeSelect = null;
			this.selectedValues = [];
			this.pageLookup = {};
			this.items = [];
		});
	},

	createItem: function(data = {}) {
		return {
			id: data.id || ("item_" + this.itemSeq++),
			type: data.type || "link",
			label: data.label || "Link",
			url: data.url || "",
			parentId: data.parentId || null
		};
	},

	parseNavbar: function(node) {
		const parsedItems = [];
		const navList = node.querySelector(".navbar-nav");
		if (!navList) {
			return parsedItems;
		}

		if (navList.className) {
			this.styleDefaults.navListClass = navList.className;
		}

		navList.querySelectorAll(":scope > li").forEach((li) => {
			const toggle = li.querySelector(":scope > a.dropdown-toggle");
			const dropdownMenu = li.querySelector(":scope > .dropdown-menu");

			if (toggle && dropdownMenu) {
				if (li.className) this.styleDefaults.dropdownLiClass = li.className;
				if (toggle.className) this.styleDefaults.dropdownToggleClass = toggle.className;
				if (dropdownMenu.className) this.styleDefaults.dropdownMenuClass = dropdownMenu.className;

				const parentItem = this.createItem({
					type: "dropdown",
					label: toggle.textContent?.trim() || "Dropdown",
					url: "",
					parentId: null
				});
				parsedItems.push(parentItem);

				dropdownMenu.querySelectorAll(":scope > a, :scope > li > a").forEach((childA) => {
					if (childA.className) this.styleDefaults.dropdownItemClass = childA.className;
					parsedItems.push(this.createItem({
						type: childA.getAttribute("data-type") === "page" ? "page" : "link",
						label: childA.textContent?.trim() || (childA.getAttribute("data-type") === "page" ? "Page" : "Link"),
						url: childA.getAttribute("href") || "#",
						parentId: parentItem.id
					}));
				});
			} else {
				const link = li.querySelector(":scope > a");
				if (!link) {
					return;
				}

				if (li.className) this.styleDefaults.linkLiClass = li.className;
				if (link.className) this.styleDefaults.linkAClass = link.className;

				parsedItems.push(this.createItem({
					type: link.getAttribute("data-type") === "page" ? "page" : "link",
					label: link.textContent?.trim() || (link.getAttribute("data-type") === "page" ? "Page" : "Link"),
					url: link.getAttribute("href") || "#",
					parentId: null
				}));
			}
		});

		return parsedItems;
	},

	renderItemsEditor: function() {
		const modalEl = document.getElementById(this.modalId);
		if (!modalEl) {
			return;
		}

		const container = modalEl.querySelector(".st-navbar-items");
		if (!container) {
			return;
		}

		if (!this.items.length) {
			container.innerHTML = "<div class='text-muted small p-2'>No links yet. Add pages, custom links, or dropdowns.</div>";
			return;
		}

		const dropdownOptions = this.items
			.filter((item) => item.type === "dropdown")
			.map((item) => `<option value="${item.id}">${this.escapeHtml(item.label || "Dropdown")}</option>`)
			.join("");

		container.innerHTML = this.items.map((item, index) => {
			const parentSelect = item.type === "dropdown"
				? ""
				: `
					<select class="form-select form-select-sm st-navbar-item-parent" data-item-id="${item.id}">
						<option value="">Top level</option>
						${dropdownOptions}
					</select>
				`;

			const urlInput = item.type === "dropdown"
				? ""
				: `<input type="text" class="form-control form-control-sm st-navbar-item-url" data-item-id="${item.id}" placeholder="/page-or-url" value="${this.escapeAttr(item.url || "")}">`;

			return `
				<div class="border rounded p-2 mb-2" data-item-id="${item.id}">
					<div class="d-flex justify-content-between align-items-center mb-2">
						<span class="badge bg-light text-dark border">${item.type === "dropdown" ? "Dropdown" : (item.type === "page" ? "Page" : "Link")}</span>
						<div class="d-flex gap-1">
							<button type="button" class="btn btn-sm btn-light st-navbar-move-up" data-item-id="${item.id}" ${index === 0 ? "disabled" : ""}>Up</button>
							<button type="button" class="btn btn-sm btn-light st-navbar-move-down" data-item-id="${item.id}" ${index === this.items.length - 1 ? "disabled" : ""}>Down</button>
							<button type="button" class="btn btn-sm btn-outline-danger st-navbar-remove-item" data-item-id="${item.id}">Remove</button>
						</div>
					</div>
					<div class="row g-2">
						<div class="col-12">
							<input type="text" class="form-control form-control-sm st-navbar-item-label" data-item-id="${item.id}" placeholder="Label" value="${this.escapeAttr(item.label || "")}">
						</div>
						${item.type === "dropdown" ? "" : `<div class="col-12">${urlInput}</div><div class="col-12">${parentSelect}</div>`}
					</div>
				</div>
			`;
		}).join("");

		container.querySelectorAll(".st-navbar-item-label").forEach((input) => {
			input.addEventListener("input", () => {
				const item = this.findItem(input.dataset.itemId);
				if (item) {
					item.label = input.value;
					if (item.type === "dropdown") {
						this.renderItemsEditor();
					}
				}
			});
		});

		container.querySelectorAll(".st-navbar-item-url").forEach((input) => {
			input.addEventListener("input", () => {
				const item = this.findItem(input.dataset.itemId);
				if (item) {
					item.url = input.value;
				}
			});
		});

		container.querySelectorAll(".st-navbar-item-parent").forEach((select) => {
			const item = this.findItem(select.dataset.itemId);
			if (!item) {
				return;
			}

			select.value = item.parentId || "";
			select.querySelectorAll("option").forEach((option) => {
				if (option.value === item.id) {
					option.disabled = true;
				}
			});

			select.addEventListener("change", () => {
				item.parentId = select.value || null;
			});
		});

		container.querySelectorAll(".st-navbar-remove-item").forEach((btn) => {
			btn.addEventListener("click", () => {
				this.removeItem(btn.dataset.itemId);
				this.renderItemsEditor();
			});
		});

		container.querySelectorAll(".st-navbar-move-up").forEach((btn) => {
			btn.addEventListener("click", () => {
				this.moveItem(btn.dataset.itemId, -1);
				this.renderItemsEditor();
			});
		});

		container.querySelectorAll(".st-navbar-move-down").forEach((btn) => {
			btn.addEventListener("click", () => {
				this.moveItem(btn.dataset.itemId, 1);
				this.renderItemsEditor();
			});
		});
	},

	findItem: function(id) {
		return this.items.find((item) => item.id === id) || null;
	},

	removeItem: function(id) {
		const removed = this.findItem(id);
		if (!removed) {
			return;
		}

		if (removed.type === "dropdown") {
			this.items.forEach((item) => {
				if (item.parentId === removed.id) {
					item.parentId = null;
				}
			});
		}

		this.items = this.items.filter((item) => item.id !== id);
	},

	moveItem: function(id, direction) {
		const index = this.items.findIndex((item) => item.id === id);
		if (index === -1) {
			return;
		}

		const nextIndex = index + direction;
		if (nextIndex < 0 || nextIndex >= this.items.length) {
			return;
		}

		const current = this.items[index];
		this.items[index] = this.items[nextIndex];
		this.items[nextIndex] = current;
	},

	addSelectedPages: function() {
		if (!this.selectedValues.length) {
			displayToast("bg-danger", "Error", "Select one or more pages first.");
			return;
		}

		const existingLinkUrls = new Set(
			this.items
				.filter((item) => (item.type === "page" || item.type === "link") && item.url)
				.map((item) => this.normalizeUrl(item.url))
		);

		this.selectedValues.forEach((value) => {
			const page = this.pageLookup[value];
			if (!page) {
				return;
			}

			const normalizedPageUrl = this.normalizeUrl(page.url || "");
			if (!normalizedPageUrl || existingLinkUrls.has(normalizedPageUrl)) {
				return;
			}

			this.items.push(this.createItem({
				type: "page",
				label: page.title || "Page",
				url: page.url || "#",
				parentId: null
			}));

			existingLinkUrls.add(normalizedPageUrl);
		});

		this.renderItemsEditor();
	},

	getSelectedPageType: function() {
		return $("#filemanager-tabs .nav-link.active").data("type") || "page";
	},

	buildTreeData: function(response) {
		const pages = Array.isArray(response.pages) ? response.pages : [];
		const folders = response.folders || {};
		const pagesByFolder = {};
		const rootPages = [];
		const lookup = {};

		pages.forEach((page) => {
			if (!page || !page.id || !page.title || typeof page.full_url === "undefined") {
				return;
			}

			const value = "page_" + page.id;
			const folderId = page.folder || "";
			const option = {
				name: page.title,
				value: value
			};

			lookup[value] = {
				title: page.title,
				url: page.full_url
			};

			if (folderId !== "") {
				if (!pagesByFolder[folderId]) {
					pagesByFolder[folderId] = [];
				}
				pagesByFolder[folderId].push(option);
			} else {
				rootPages.push(option);
			}
		});

		const buildFolderTree = (folderObject) => {
			if (!folderObject || Object.keys(folderObject).length === 0) {
				return [];
			}

			return Object.keys(folderObject).map((key) => {
				const folder = folderObject[key];
				const node = {
					name: folder.name,
					value: "folder_" + folder.id,
					isGroupSelectable: false
				};

				let children = [];

				if (folder.children && Object.keys(folder.children).length > 0) {
					children = children.concat(buildFolderTree(folder.children));
				}

				if (pagesByFolder[folder.id]) {
					children = children.concat(pagesByFolder[folder.id]);
				}

				if (children.length > 0) {
					node.children = children;
				}

				return node;
			});
		};

		const options = buildFolderTree(folders).concat(rootPages);

		return { options, lookup };
	},

	getSelectedValuesFromItems: function(items, lookup) {
		const selectedValues = [];
		const linkHrefs = (items || [])
			.filter((item) => (item.type === "page" || item.type === "link") && item.url)
			.map((item) => this.normalizeUrl(item.url || ""));

		Object.keys(lookup).forEach((key) => {
			const href = this.normalizeUrl(lookup[key].url || "");
			if (href && linkHrefs.includes(href)) {
				selectedValues.push(key);
			}
		});

		return selectedValues;
	},

	normalizeUrl: function(url) {
		if (!url) {
			return "";
		}

		if (url.startsWith("#")) {
			return url;
		}

		let normalised = url.trim();

		try {
			normalised = new URL(normalised, window.location.origin).pathname;
		} catch (error) {
			normalised = normalised.split("?")[0].split("#")[0];
		}

		if (!normalised.startsWith("/")) {
			normalised = "/" + normalised;
		}

		if (normalised.length > 1 && normalised.endsWith("/")) {
			normalised = normalised.slice(0, -1);
		}

		return normalised;
	},

	applyItemsToNavbar: function() {
		if (!this.activeNode) {
			return;
		}

		let navList = this.activeNode.querySelector(".navbar-nav");
		if (!navList) {
			const collapse = this.activeNode.querySelector(".navbar-collapse, .collapse");
			if (collapse) {
				navList = document.createElement("ul");
				navList.className = this.styleDefaults.navListClass;
				collapse.appendChild(navList);
			} else {
				return;
			}
		}

		navList.className = navList.className || this.styleDefaults.navListClass;
		navList.innerHTML = "";

		const topLevelItems = this.items.filter((item) => !item.parentId);

		topLevelItems.forEach((item) => {
			if (item.type === "dropdown") {
				const li = document.createElement("li");
				li.className = this.styleDefaults.dropdownLiClass;

				const toggle = document.createElement("a");
				toggle.className = this.styleDefaults.dropdownToggleClass;
				toggle.setAttribute("href", "#");
				toggle.setAttribute("role", "button");
				toggle.setAttribute("data-bs-toggle", "dropdown");
				toggle.setAttribute("aria-expanded", "false");
				toggle.textContent = item.label || "Dropdown";

				const menu = document.createElement("div");
				menu.className = this.styleDefaults.dropdownMenuClass;

				this.items
					.filter((child) => (child.type === "link" || child.type === "page") && child.parentId === item.id)
					.forEach((child) => {
						const childLink = document.createElement("a");
						childLink.className = this.styleDefaults.dropdownItemClass;
						childLink.setAttribute("href", child.url || "#");
						childLink.textContent = child.label || (child.type === "page" ? "Page" : "Link");
						menu.appendChild(childLink);
					});

				li.appendChild(toggle);
				li.appendChild(menu);
				navList.appendChild(li);
				return;
			}

			if (item.type === "link" || item.type === "page") {
				const li = document.createElement("li");
				li.className = this.styleDefaults.linkLiClass;

				const link = document.createElement("a");
				link.className = this.styleDefaults.linkAClass;
				link.setAttribute("href", item.url || "#");
				link.textContent = item.label || (item.type === "page" ? "Page" : "Link");
				link.setAttribute("data-type", item.type === "page" ? "page" : "link");

				li.appendChild(link);
				navList.appendChild(li);
			}
		});

		Vvveb.Builder.selectNode(this.activeNode);
		Vvveb.TreeList.loadComponents();
		Vvveb.TreeList.selectComponent(this.activeNode);
	},

	escapeHtml: function(text) {
		return String(text || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\"/g, "&quot;")
			.replace(/'/g, "&#039;");
	},

	escapeAttr: function(text) {
		return this.escapeHtml(text);
	}
};

function componentInit(component, node) {

	// check the node has a data-id attribute
	var blockId = "";
	if ($(node).attr('data-id')) {
		blockId = $(node).attr('data-id');
	}

	// check for a block id
	if(blockId != "") {

		// get the block data
		stAjaxCall("getWebsiteBlockSettings", {id: blockId}).then((response) => {

			// check the response for values
			if (response && response.values) {

				// set the values for the properties
				component.properties.forEach(prop => {
					var propValue = response.values[prop.key] || "";
					var propElement = $(prop.input).find('[name="' + prop.key + '"]');
					if(propElement.length) {
						propElement.val(propValue);
					}
					Vvveb.Components.updateProperty("custom/" + component.type, prop.key, propValue);
				});
			} else {
				console.debug('No values returned for component:', component.name);
			}
		}).catch((err) => {
			console.debug('Promise rejected:', err);
		});
	}
}

function componentAfterDrop(component, node) {
	console.debug(component.name + ' component after drop:', node);
}

function componentOnChange(component, node, property, value) {

	// get the mandatory properties
	var mandatoryProperties = component.properties.filter(prop => prop.name.endsWith('*'));

	// check if all mandatory properties are set
	if (mandatoryProperties.length) {
		var allMandatorySet = mandatoryProperties.every(prop => {

			// find the element value
			var propElement = $(prop.input).find('[name="' + prop.key + '"]');
			var propValue = "";
			if(propElement.length) {
				var propValue = propElement.val();
			}
			return propValue !== undefined && propValue !== null && propValue !== '';
		});

		// check if all mandatory properties are set
		if (!allMandatorySet) {
			console.debug('Not all mandatory properties are set for component:', component.name);
			return;
		}

		// check the node has a data-id attribute
		var blockId = "";
		if ($(node).attr('data-id')) {
			blockId = $(node).attr('data-id');
		}

		// get all property values
		var propertyValues = {};
		propertyValues['sys_webl_type'] = component.type;
		propertyValues['sys_webl_id'] = blockId;
		component.properties.forEach(prop => {
			var propElement = $(prop.input).find('[name="' + prop.key + '"]');
			var propValue = "";
			if(propElement.length) {
				propValue = propElement.val();
			}
			propertyValues[prop.key] = propValue;
		});

		// create or update the block
		stAjaxCall("createWebsiteBlock", propertyValues).then((response) => {

			// check the response for an id
			if (response && response.id) {

				// update the node with the new id
				$(node).attr('data-id', response.id);

				// check for block data
				if(response.block) {

					var html = response.block.html || "";
					var js = response.block.JS || "";
					var css = response.block.CSS || "";
					if(html != "") {

						// update the node's HTML
						$(node).html(html);

						// move the st-website-block element outside of the node
						var stWebsiteBlock = $(node).children('.st-website-block').first();
						if(stWebsiteBlock.length > 0) {

							// check if the node has a parent
							if(node.parentElement) {

								// move the st-website-block element to the parent
								$(node.parentElement).append(stWebsiteBlock);

								// add the classes from the node to the st-website-block element
								for (const className of $(node).attr('class').split(' ')) {
									if(className
										&& className !== 'st-website-block'
										&& className !== 'st-no-edit'
										&& className !== 'st-vvveb-temp'
										&& className !== 'st-vvveb-block-'
									) {
										stWebsiteBlock.addClass(className);
									}
								}
							} else {
								console.warn('Node has no parent, cannot move st-website-block element');
							}

							// check for js
							if(js != "") {

								// create a script element
								var script = `<script type="text/javascript" class="st-ignore">${js}</script>`;
								$(node).after(script);
							}

							// check for css
							if(css != "") {

								// create a style element
								var style = `<style type="text/css" class="st-ignore">${css}</style>`;
								$(node).after(style);
							}

							// remove the node
							$(node).remove();
						}
					}
				}
			} else {
				console.debug('No id returned for component:', component.name);
			}
		}).catch((err) => {
			console.debug('Promise rejected:', err);
		});
	}
}