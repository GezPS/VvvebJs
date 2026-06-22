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
	collapsedDropdowns: {},
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
								<div class="d-flex gap-2 flex-wrap align-items-center">
									<button type="button" class="btn btn-outline-primary btn-sm st-navbar-add-pages">Add selected pages</button>
									<div class="input-group input-group-sm" style="width:auto">
										<select class="form-select form-select-sm st-navbar-add-type" style="width:auto">
											<option value="link">Custom link</option>
											<option value="dropdown">Dropdown</option>
										</select>
										<button type="button" class="btn btn-outline-secondary st-navbar-add-manual">Add</button>
									</div>
								</div>
							</div>
							<div class="col-md-7">
								<div class="st-navbar-items border rounded p-2" style="min-height: 280px; max-height: 460px; overflow:auto"></div>
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

		modal.querySelector(".st-navbar-add-manual").addEventListener("click", () => {
			const type = modal.querySelector(".st-navbar-add-type").value;
			if (type === "dropdown") {
				this.items.push(this.createItem({ type: "dropdown", label: "Dropdown", url: "", parentId: null }));
			} else {
				this.items.push(this.createItem({ type: "link", label: "Custom link", url: "#", parentId: null }));
			}
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
			this.expandedItems = new Set();
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
		if (!this.expandedItems) {
			this.expandedItems = new Set();
		}

		const modalEl = document.getElementById(this.modalId);
		if (!modalEl) {
			return;
		}

		const container = modalEl.querySelector(".st-navbar-items");
		if (!container) {
			return;
		}

		if (!this.items.length) {
			container.innerHTML = "<div class='text-muted small p-2'>No links yet. Add pages or custom links using the buttons on the left.</div>";
			return;
		}

		const topLevelItems = this.items.filter((item) => !item.parentId);

		const renderItemRow = (item, isChild) => {
			const typeBadge = item.type === "dropdown" ? "Dropdown" : (item.type === "page" ? "Page" : "Link");
			const isExpanded = this.expandedItems.has(item.id);
			const expandIcon = isExpanded ? "▾" : "▸";

			// URL field: all non-dropdown items share a URL input with page-search autocomplete
			const urlField = item.type === "dropdown"
				? ""
				: `<div class="mt-2 position-relative">
					<input type="text" class="form-control form-control-sm st-navbar-item-url st-navbar-page-search" data-item-id="${item.id}" placeholder="URL or search pages…" value="${this.escapeAttr(item.url || "")}" autocomplete="off">
					<div class="st-navbar-page-results position-absolute bg-white border rounded shadow-sm w-100" data-item-id="${item.id}" style="display:none;z-index:9999;max-height:160px;overflow-y:auto"></div>
				</div>`;

			const labelField = `<div class="mt-2"><input type="text" class="form-control form-control-sm st-navbar-item-label" data-item-id="${item.id}" placeholder="Label" value="${this.escapeAttr(item.label || "")}"></div>`;

			const parentSelectField = (item.type !== "dropdown" && !isChild)
				? (() => {
					const opts = this.items
						.filter((d) => d.type === "dropdown" && d.id !== item.id)
						.map((d) => `<option value="${d.id}"${item.parentId === d.id ? " selected" : ""}>${this.escapeHtml(d.label || "Dropdown")}</option>`)
						.join("");
					return `<div class="mt-2">
						<select class="form-select form-select-sm st-navbar-item-parent" data-item-id="${item.id}">
							<option value=""${!item.parentId ? " selected" : ""}>Top level</option>
							${opts}
						</select>
					</div>`;
				})()
				: "";

			const expandedContent = isExpanded
				? `<div class="st-navbar-item-details">${labelField}${urlField}${parentSelectField}</div>`
				: "";

			return `
				<div class="st-navbar-row border rounded px-2 py-1 mb-1" data-item-id="${item.id}" draggable="true">
					<div class="d-flex align-items-center gap-1">
						<span class="st-navbar-drag-handle text-muted me-1" style="cursor:grab;font-size:1rem;line-height:1;user-select:none" title="Drag to reorder">⠿</span>
						<span class="badge bg-light text-dark border me-1" style="font-size:0.7em">${typeBadge}</span>
						<span class="flex-grow-1 text-truncate small st-navbar-item-display-label">${this.escapeHtml(item.label || "(no label)")}</span>
						<button type="button" class="btn btn-sm btn-link p-0 px-1 st-navbar-expand-btn" data-item-id="${item.id}" title="${isExpanded ? "Collapse" : "Expand"}">${expandIcon}</button>
						<button type="button" class="btn btn-sm btn-link p-0 px-1 text-danger st-navbar-remove-item" data-item-id="${item.id}" title="Remove">×</button>
					</div>
					${expandedContent}
				</div>
			`;
		};

		let html = "";
		topLevelItems.forEach((item) => {
			html += renderItemRow(item, false);

			if (item.type === "dropdown") {
				const children = this.items.filter((c) => c.parentId === item.id);
				const collapsed = !!this.collapsedDropdowns[item.id];
				html += `<div class="st-navbar-children ps-3 border-start ms-2 mb-1" data-parent-id="${item.id}" ${collapsed ? 'style="display:none"' : ""}>`;
				if (children.length) {
					children.forEach((child) => {
						html += renderItemRow(child, true);
					});
				} else {
					html += `<div class="text-muted small py-1 ps-1">No items - add links and assign them to this dropdown.</div>`;
				}
				html += "</div>";
			}
		});

		container.innerHTML = html;

		// Expand/collapse individual item details
		container.querySelectorAll(".st-navbar-expand-btn").forEach((btn) => {
			btn.addEventListener("click", () => {
				const id = btn.dataset.itemId;
				if (this.expandedItems.has(id)) {
					this.expandedItems.delete(id);
				} else {
					this.expandedItems.add(id);
				}
				this.renderItemsEditor();
			});
		});

		// Label input
		container.querySelectorAll(".st-navbar-item-label").forEach((input) => {
			input.addEventListener("input", () => {
				const item = this.findItem(input.dataset.itemId);
				if (item) {
					item.label = input.value;
					const display = container.querySelector(`.st-navbar-row[data-item-id="${item.id}"] .st-navbar-item-display-label`);
					if (display) {
						display.textContent = item.label || "(no label)";
					}
					if (item.type === "dropdown") {
						// Refresh child dropdowns that reference this dropdown's label
						container.querySelectorAll(".st-navbar-item-parent").forEach((sel) => {
							const opt = sel.querySelector(`option[value="${item.id}"]`);
							if (opt) {
								opt.textContent = item.label || "Dropdown";
							}
						});
					}
				}
			});
		});

		// URL input with page-search autocomplete (shared on the same element)
		container.querySelectorAll(".st-navbar-page-search").forEach((input) => {
			const resultsEl = container.querySelector(`.st-navbar-page-results[data-item-id="${input.dataset.itemId}"]`);
			let debounceTimer = null;

			// Always keep item.url in sync with what the user types
			input.addEventListener("input", () => {
				const item = this.findItem(input.dataset.itemId);
				if (item) {
					item.url = input.value;
				}

				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					const query = input.value.trim().toLowerCase();
					if (!query || !resultsEl || !Object.keys(this.pageLookup).length) {
						if (resultsEl) resultsEl.style.display = "none";
						return;
					}
					const matches = Object.values(this.pageLookup).filter((p) =>
						(p.title && p.title.toLowerCase().includes(query)) ||
						(p.url && p.url.toLowerCase().includes(query))
					).slice(0, 12);

					if (!matches.length) {
						resultsEl.style.display = "none";
						return;
					}

					resultsEl.innerHTML = matches.map((p) =>
						`<div class="px-2 py-1 small st-navbar-page-result-item" style="cursor:pointer" data-url="${this.escapeAttr(p.url)}" data-title="${this.escapeAttr(p.title)}">
							<div>${this.escapeHtml(p.title)}</div>
							<div class="text-muted" style="font-size:0.75em">${this.escapeHtml(p.url)}</div>
						</div>`
					).join("");
					resultsEl.style.display = "block";

					resultsEl.querySelectorAll(".st-navbar-page-result-item").forEach((row) => {
						row.addEventListener("mousedown", (e) => {
							e.preventDefault();
							const item = this.findItem(input.dataset.itemId);
							if (item) {
								item.url = row.dataset.url;
								// Only auto-fill label if it's still the default placeholder
								if (!item.label || item.label === "Custom link" || item.label === "Link") {
									item.label = row.dataset.title;
									const labelInput = container.querySelector(`.st-navbar-item-label[data-item-id="${item.id}"]`);
									if (labelInput) {
										labelInput.value = row.dataset.title;
									}
									const display = container.querySelector(`.st-navbar-row[data-item-id="${item.id}"] .st-navbar-item-display-label`);
									if (display) {
										display.textContent = row.dataset.title;
									}
								}
							}
							input.value = row.dataset.url;
							resultsEl.style.display = "none";
						});
					});
				}, 200);
			});

			input.addEventListener("blur", () => {
				setTimeout(() => {
					if (resultsEl) resultsEl.style.display = "none";
				}, 150);
			});
		});

		// Parent select
		container.querySelectorAll(".st-navbar-item-parent").forEach((select) => {
			select.addEventListener("change", () => {
				const item = this.findItem(select.dataset.itemId);
				if (!item) {
					return;
				}
				const newParentId = select.value || null;
				item.parentId = newParentId;

				const fromIndex = this.items.indexOf(item);
				this.items.splice(fromIndex, 1);

				if (newParentId) {
					const parentIndex = this.items.findIndex((i) => i.id === newParentId);
					let insertAt = parentIndex + 1;
					while (insertAt < this.items.length && this.items[insertAt].parentId === newParentId) {
						insertAt++;
					}
					this.items.splice(insertAt, 0, item);
				} else {
					this.items.push(item);
				}

				this.renderItemsEditor();
			});
		});

		// Remove
		container.querySelectorAll(".st-navbar-remove-item").forEach((btn) => {
			btn.addEventListener("click", () => {
				this.expandedItems.delete(btn.dataset.itemId);
				this.removeItem(btn.dataset.itemId);
				this.renderItemsEditor();
			});
		});

		// Drag-and-drop reorder with insertion-line indicator
		let dragSourceId = null;

		const clearDropIndicators = () => {
			container.querySelectorAll(".st-navbar-row").forEach((r) => {
				r.classList.remove("st-navbar-drop-before", "st-navbar-drop-after");
			});
		};

		const getDropPosition = (e, row) => {
			const rect = row.getBoundingClientRect();
			return (e.clientY - rect.top) < (rect.height / 2) ? "before" : "after";
		};

		container.querySelectorAll(".st-navbar-row").forEach((row) => {
			row.addEventListener("dragstart", (e) => {
				dragSourceId = row.dataset.itemId;
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/plain", row.dataset.itemId);
				setTimeout(() => { row.style.opacity = "0.4"; }, 0);
			});

			row.addEventListener("dragend", () => {
				row.style.opacity = "";
				clearDropIndicators();
			});

			row.addEventListener("dragover", (e) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				clearDropIndicators();
				const pos = getDropPosition(e, row);
				row.classList.add(pos === "before" ? "st-navbar-drop-before" : "st-navbar-drop-after");
			});

			row.addEventListener("dragleave", (e) => {
				// Only clear if leaving to outside the container entirely
				if (!row.contains(e.relatedTarget)) {
					row.classList.remove("st-navbar-drop-before", "st-navbar-drop-after");
				}
			});

			row.addEventListener("drop", (e) => {
				e.preventDefault();
				const pos = getDropPosition(e, row);
				clearDropIndicators();
				if (dragSourceId && dragSourceId !== row.dataset.itemId) {
					this.moveItemTo(dragSourceId, row.dataset.itemId, pos);
					this.renderItemsEditor();
				}
				dragSourceId = null;
			});
		});
	},

	findItem: function(id) {
		return this.items.find((item) => item.id === id) || null;
	},

	// Move dragged item before or after the target item, respecting peer groups
	moveItemTo: function(fromId, toId, pos) {
		const fromItem = this.findItem(fromId);
		const toItem   = this.findItem(toId);
		if (!fromItem || !toItem || fromId === toId) {
			return;
		}

		// Prevent dropping a dropdown into one of its own children
		if (fromItem.type === "dropdown" && toItem.parentId === fromItem.id) {
			return;
		}

		const fromIndex = this.items.indexOf(fromItem);
		if (fromIndex === -1) {
			return;
		}

		// Remove from current position
		this.items.splice(fromIndex, 1);

		// Adopt target's parent context
		fromItem.parentId = toItem.parentId || null;

		// Insert before or after the target
		let toIndex = this.items.indexOf(toItem);
		if (toIndex === -1) {
			this.items.push(fromItem);
			return;
		}

		if (pos === "after") {
			toIndex += 1;
		}

		this.items.splice(toIndex, 0, fromItem);
	},

	removeItem: function(id) {
		const removed = this.findItem(id);
		if (!removed) {
			return;
		}

		if (removed.type === "dropdown") {
			// orphan children become top-level, inserted at the dropdown's former position
			const removedIndex = this.items.findIndex((item) => item.id === id);
			const children = this.items.filter((item) => item.parentId === removed.id);
			children.forEach((item) => {
				item.parentId = null;
			});

			// remove the dropdown, then re-insert the orphaned children at that position
			this.items = this.items.filter((item) => item.id !== id);
			children.forEach((child, offset) => {
				this.items.splice(removedIndex + offset, 0, child);
			});
			return;
		}

		this.items = this.items.filter((item) => item.id !== id);
	},

	moveItem: function(id, direction) {
		const item = this.findItem(id);
		if (!item) {
			return;
		}

		// build the peer list: top-level items or siblings sharing the same parentId
		const peers = item.parentId
			? this.items.filter((i) => i.parentId === item.parentId)
			: this.items.filter((i) => !i.parentId);

		const peerIndex = peers.findIndex((i) => i.id === id);
		const targetPeerIndex = peerIndex + direction;
		if (targetPeerIndex < 0 || targetPeerIndex >= peers.length) {
			return;
		}

		// swap the two items within the flat this.items array
		const fromIndex = this.items.indexOf(item);
		const toIndex = this.items.indexOf(peers[targetPeerIndex]);
		if (fromIndex === -1 || toIndex === -1) {
			return;
		}

		this.items[fromIndex] = peers[targetPeerIndex];
		this.items[toIndex] = item;
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