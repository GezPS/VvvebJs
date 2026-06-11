$(document).ready(function () {

	// build the page folders on load
	stBuildPageFolders();

	// build the file manager nav items
	stBuildNavItems();

	// close the right panel
	Vvveb.Gui.toggleRightColumn(false);

	var folder_select = $('select.st-parent-folder-select');
	folder_select.on('mousedown', function() {

        // loop through all options and set their text to the prefixed version
        $(this).find('option').each(function() {
            $(this).text($(this).data('prefixed-name'));
        });
    });

	folder_select.on('change', function() {

        // get just the one option that was selected
        var selectedOption = $(this).find('option:selected');

        // set the selected option's text to the clean version
        selectedOption.text(selectedOption.data('clean-name'));

		// update the link preview
		stUpdatePageLinkPreview();
    });

	if($('#new-page-modal').length) {
		$('#new-page-modal').on('shown.bs.modal', function () {
			if(!$(this).data('templates-loaded')) {
				loadTemplates();
			}
		});
	}

	if($('#st-new-folder-modal').length) {
		$('#st-new-folder-modal').on('shown.bs.modal', function () {
			if(!$(this).data('templates-loaded')) {
				loadTemplates();
			}
		});
	}

	$('#st-new-template').submit(function (e) {
		e.preventDefault();

		// first, get the page html
		var html = Vvveb.Builder.getHtml();

		// get the template details
		var templateName = $(this).find('input[name="title"]').val();
		var folder = $(this).find('select[name="folder"]').val();

		// make the ajax call to create the template
		stAjaxCall('createTemplate', {
			name: templateName,
			folder: folder,
			html: html
		}, 'POST', true).then(async (response) => {
			if(response && response.success) {

				// close the modal
				$('#st-new-template-modal').modal('hide');

				// reload the templates
				stGetPages('template');

				// rebuild the page folders
				stBuildPageFolders();

				// show success message
				displayToast("bg-success", "Success", "Template created successfully.");
			}
		});
	});

	$('#st-new-folder').submit(function (e) {
		e.preventDefault();

		// get the folder details
		var folderName = $(this).find('input[name="title"]').val();
		var parent = $(this).find('select[name="parent"]').val();

		// make the ajax call to create the folder
		stAjaxCall('createFolder', {
			name: folderName,
			parent: parent
		}, 'POST', true).then(async (response) => {
			if(response && response.success) {

				// close the modal
				$('#st-new-folder-modal').modal('hide');

				// get the currently selected page type from the file manager tabs
				const selectedType = $('#filemanager-tabs .nav-link.active').data('type') || 'page';

				// reload the pages
				stGetPages(selectedType);

				// rebuild the page folders
				stBuildPageFolders();
			}
		});
	});

	$('#new-page-modal input[name="url"]').data('changed', false);
	$('#new-page-modal input[name="url"]').on('input', function() {

		// get the page title
		var title = $('#new-page-modal input[name="title"]').val();
		var pageLink = stBuildPageLink(title);

		// check if the link matches the built link
		if($(this).val() != pageLink) {

			// mark as changed
			$(this).data('changed', true);
		} else {

			// mark as not changed
			$(this).data('changed', false);
		}

		// update the link preview
		stUpdatePageLinkPreview();
	});

	$('#new-page-modal input[name="url"]').on('change', function() {

		// if empty, mark as not changed and build from title
		if($(this).val() == '') {
			var title = $('#new-page-modal input[name="title"]').val();
			var link = stBuildPageLink(title);
			$('#new-page-modal input[name="url"]').val(link);
			$(this).data('changed', false);

			// update the link preview
			stUpdatePageLinkPreview();
		}
	});

	$('#new-page-modal input[name="title"]').on('input', function() {

		// check that the link hasn't been manually changed
		var linkChanged = $('#new-page-modal input[name="url"]').data('changed');
		var title = $(this).val();
		var pageLink = stBuildPageLink(title);

		// only update the link if it hasn't been changed manually or it matches the built link
		if(!linkChanged) {
			$('#new-page-modal input[name="url"]').val(pageLink);
		} else {

			// check if the link now matches the built link
			var currentLink = $('#new-page-modal input[name="url"]').val();
			if(currentLink == pageLink
				|| currentLink == ''
			) {

				// mark as not changed
				$('#new-page-modal input[name="url"]').data('changed', false);
			}
		}

		// update the link preview
		stUpdatePageLinkPreview();
	});

	$('#new-page-modal select[name="type"]').on('change', function() {
		var selectedType = $(this).val();
		switch(selectedType) {

			// hide the folder select if it's a blog post
			case 'blog':
				$('#new-page-modal .st-parent-folder-select').closest('.mb-3').hide();
				$('#new-page-modal .st-parent-folder-select').val('');
				$('#new-page-modal input[name="url"]').closest('.row').show();
				stUpdatePageLinkPreview();
				changeFieldLabel(
					$('#new-page-modal input[name="title"]').closest('.row').find('label'),
					$('#new-page-modal input[name="title"]'),
					'Blog Name',
					'My Blog'
				);
				$('#new-page-modal form .btn[type="submit"]').html('<i class="la la-check"></i> Create Blog');
				changeFieldLabel(
					$('#new-page-modal input[name="url"]').closest('.row').find('label'),
					$('#new-page-modal input[name="url"]'),
					'Blog Link',
					'my-blog'
				);
				break;
			case 'page':
				$('#new-page-modal .st-parent-folder-select').closest('.mb-3').show();
				$('#new-page-modal input[name="url"]').closest('.row').show();
				stUpdatePageLinkPreview();
				changeFieldLabel(
					$('#new-page-modal input[name="title"]').closest('.row').find('label'),
					$('#new-page-modal input[name="title"]'),
					'Page Name',
					'My Page'
				);
				$('#new-page-modal form .btn[type="submit"]').html('<i class="la la-check"></i> Create Page');
				changeFieldLabel(
					$('#new-page-modal input[name="url"]').closest('.row').find('label'),
					$('#new-page-modal input[name="url"]'),
					'Page Link',
					'my-page'
				);
				break;
			case 'template':
				$('#new-page-modal .st-parent-folder-select').closest('.mb-3').show();
				$('#new-page-modal input[name="url"]').closest('.row').hide();
				stUpdatePageLinkPreview();
				changeFieldLabel(
					$('#new-page-modal input[name="title"]').closest('.row').find('label'),
					$('#new-page-modal input[name="title"]'),
					'Template Name',
					'My Template'
				);
				$('#new-page-modal form .btn[type="submit"]').html('<i class="la la-check"></i> Create Template');
				break;
			case 'menu':
				$('#new-page-modal .st-parent-folder-select').closest('.mb-3').hide().val('');
				$('#new-page-modal input[name="url"]').closest('.row').hide().val('');
				$('#new-page-modal input[name="template"]').closest('.mb-3').hide().val('');
				stUpdatePageLinkPreview();
				changeFieldLabel(
					$('#new-page-modal input[name="title"]').closest('.row').find('label'),
					$('#new-page-modal input[name="title"]'),
					'Menu Name',
					'Main Menu'
				);
				$('#new-page-modal form .btn[type="submit"]').html('<i class="la la-check"></i> Create Menu');
				break;
		}

		function changeFieldLabel(label, field, name, placeholder = "") {
			if(field.length) {
				label.text(name);
			}
			if(placeholder !== "") {
				field.attr('placeholder', placeholder);
			}
		}
	});

	$('#st-search-input').on('input change', function(e) {
		e.preventDefault();
		var searchTerm = $(this).val().toLowerCase();
		var $allPages = $('#filemanager .file-tree.active li');

		// reset the list if the search is cleared
		if (searchTerm === '') {
			$allPages.show();
			return;
		}

		searchPages(searchTerm, $allPages);
	});

	$('#filemanager .clear-backspace').on('click', function(e) {
		e.preventDefault();
		$('#st-search-input').val('').trigger('input');
	});

	$('#filemanager-tabs .nav-link').on('click', function(e) {

		// get the elements data-type attribute to determine which tab was clicked
		var target = $(this).data('type');
		if(target) {
			stGetPages(target);

			// set the #new-page-modal select[name="type"] value to match the selected tab
			$('#new-page-modal select[name="type"]').val(target).trigger('change');
		}
	});
});

function stBuildNavItems() {
	const $container = $('.tab-slider-container');
	if($container.length) {
		const $slider = $container.find('#tabSlider');
		const $slideLeft = $container.find('#slideLeft');
		const $slideRight = $container.find('#slideRight');

		function updateArrowStates() {
			const scrollLeft = $slider.scrollLeft();
			const maxScroll = $slider[0].scrollWidth - $slider.innerWidth();

			// Disable left arrow if at the start
			$slideLeft.prop('disabled', scrollLeft <= 0);

			// Disable right arrow if at the end (using a 1px buffer for rounding issues)
			$slideRight.prop('disabled', scrollLeft >= maxScroll - 1);
		}

		// Initial check
		updateArrowStates();

		// Check states whenever the user scrolls
		$slider.on('scroll', updateArrowStates);

		$slideLeft.on('click', function() {
			$slider.scrollLeft($slider.scrollLeft() - $slider.innerWidth());
		});

		$slideRight.on('click', function() {
			$slider.scrollLeft($slider.scrollLeft() + $slider.innerWidth());
		});
	}
}

function loadTemplates() {

    // get the custom templates
    stAjaxCall('getTemplates', {}, 'GET').then(async (response) => {
        if(response && response.templates) {

            // merge templates and folders into the treeselect format
            var treeselectData = formatTemplatesForTreeselect(response.folders || {}, response.templates);

            // get the template container
            let templateContainers = $('.st-template-container');

            templateContainers.each(function() {
                let containerDiv = this; // Raw DOM element
                let $container = $(this); // jQuery object

                // only load the templates if we haven't already
                if(!$container.data('templates-loaded')) {

                    // clear container in case of re-render
                    containerDiv.innerHTML = '';

                    // initialise treeselect
                    let domEl = new Treeselect({
                        parentHtmlContainer: containerDiv,
                        value: null,
                        options: treeselectData,
                        isSingleSelect: true,
                        placeholder: 'Select a template',
                        searchable: true,
						disabledBranchNodes: true,
						inputCallback: (selectedValue) => {

							// check if the selected item is a folder
							if (selectedValue && String(selectedValue).startsWith('folder_')) {

							    // clear the treeselect field so it doesn't stay selected
							    domEl.updateValue(null);

							    // clear the hidden input to be safe
							    $container.parent().find('.st-template-input').val('');
							    return;
							}

							// update the hidden input for form submission
							$container.parent().find('.st-template-select').val(selectedValue);
							console.log('User selected template ID:', selectedValue);
						}
                    });

                    // mark templates as loaded
                    $container.data('templates-loaded', true);

                    // add the same attribute to the nearest modal, if there is one
                    var nearestModal = $container.closest('.modal');
                    if(nearestModal.length) {
                        nearestModal.data('templates-loaded', true);
                    }
                }
            });
        }
    });
}

/**
 * Creates the Treeselect options
 */
function formatTemplatesForTreeselect(folders, templates) {
    var folderToTemplates = {};
    var rootTemplates = [];

    // group templates by their parent folder ID
    if (templates) {
        Object.keys(templates).forEach(function(key) {
            var tpl = templates[key];

            // if it belongs to a folder, push to that folder's array
            if (tpl.folder && tpl.folder !== "") {
                if (!folderToTemplates[tpl.folder]) {
                    folderToTemplates[tpl.folder] = [];
                }
                folderToTemplates[tpl.folder].push(tpl);
            } else {

                // otherwise, it sits at the root
                rootTemplates.push(tpl);
            }
        });
    }

    // recursive function to build the folder tree templates
    function buildFolderTree(folderObject) {
        if (!folderObject || Object.keys(folderObject).length === 0) {
            return [];
        }
        return Object.keys(folderObject).map(function(key) {
            var folder = folderObject[key];
            var node = {
                name: folder.name,
                value: 'folder_' + folder.id,
				isGroupSelectable: false
            };

            var children = [];

            // add child folders recursively
            if (folder.children && Object.keys(folder.children).length > 0) {
                children = children.concat(buildFolderTree(folder.children));
            }

            // add templates that belong to this specific folder
            if (folderToTemplates[folder.id]) {
                var templateNodes = folderToTemplates[folder.id].map(function(t) {
                    return {
                        name: t.title,
                        value: t.id
                    };
                });
                children = children.concat(templateNodes);
            }

            // if the folder has either child folders or templates, attach them
            if (children.length > 0) {
                node.children = children;
            }

            return node;
        });
    }

    // build the final tree structure
    var finalTree = [];

    // add all the structured folders
    if (folders) {
        finalTree = finalTree.concat(buildFolderTree(folders));
    }

    // add root level templates at the very bottom
    var rootTemplateNodes = rootTemplates.map(function(t) {
        return { name: t.title, value: t.id };
    });
    finalTree = finalTree.concat(rootTemplateNodes);

    return finalTree;
}

function searchPages(searchTerm, list, index = 1) {
    let found = false;

    // loop through all file manager items and toggle visibility based on the search term
    list.each(function() {

        // check this is not a nested list
        if ($(this).parents('ol').length != index) {
            return;
        }

        const isFolder = $(this).hasClass('folder');
        var itemName = (isFolder) ? ($(this).data('folder') || '').toLowerCase() : ($(this).data('page') || '').toLowerCase();

        if (itemName.includes(searchTerm)) {
            found = true;
            $(this).show();

            // if a folder matches, make sure all of its contents are shown
            if (isFolder) {
                $(this).find('li').show();
            }
        } else {
            if (!isFolder) {
                $(this).hide();
            } else {

                // if it's a folder, also check if any child items match the search term
                var childList = $(this).find('li');

                if (childList.length) {
                    var matchingChild = searchPages(searchTerm, childList, index + 1);

                    if (matchingChild) {
                        found = true;
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                } else {
                    $(this).hide();
                }
            }
        }
    });

    return found;
}

function stUpdatePageLinkPreview() {

	// get the page link value
	var link = $('#new-page-modal input[name="url"]').val();

	// get the selected folder
	var selectedFolder = $('#new-page-modal select[name="folder"] option:selected');
	var folderLink = selectedFolder.attr('data-link');

	// check if the folder has a parent
	var parent = selectedFolder.data('parent');
	while(parent) {

		// get the parent option
		var parentOption = $('#new-page-modal select[name="folder"] option[value="' + parent + '"]');

		// prepend the parent link
		folderLink = parentOption.attr('data-link') + '/' + folderLink;

		// get the next parent
		parent = parentOption.data('parent');
	}

	// build the full link
	var fullLink = website_url;

	// remove any trailing slash
	if(fullLink.slice(-1) == '/') {
		fullLink = fullLink.slice(0, -1);
	}

	// add the folder & link
	if(folderLink) {
		fullLink += '/' + folderLink;
	}
	if(link) {
		fullLink += '/' + link;
	}

	// add a trailing slash if not present
	if(fullLink.slice(-1) != '/') {
		fullLink += '/';
	}

	// set the preview text
	$('#st-page-link-preview').text(fullLink);
}

function stBuildPageLink(title) {
	var link = title.toLowerCase().trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
	return link;
}

function stBuildPageFolders() {

    // get a list of available page folders
    stAjaxCall('getPageFolders', {}, 'GET').then(async (response) => {
        if(response) {
			stBuildPageFoldersSelect(response);

            // convert nested object response into treeselect's format
            var treeselectOptions = formatForTreeselect(response);
            var folderContainers = $('.st-parent-folder-container');

            folderContainers.each(function () {
                var containerDiv = this;

                // clear out any existing treeselect instances
                containerDiv.innerHTML = '';

                // initialise treeselect
                var domEl = new Treeselect({
                    parentHtmlContainer: containerDiv,
                    value: null,
                    options: treeselectOptions,
                    isSingleSelect: true,
                    placeholder: 'Select a folder',
                    searchable: true,
					inputCallback: (selectedValue) => {
						console.log('User selected folder ID:', selectedValue);

						// set the value of the hidden select field to the selected folder ID
						$(containerDiv).closest('.input').find('select.st-parent-folder-select').val(selectedValue).trigger('change');
					}
                });
            });
        }
    });
}

// convert the nested folder object into the format for Treeselect
function formatForTreeselect(folderObject) {
    if (!folderObject || Object.keys(folderObject).length === 0) {
        return [];
    }

    return Object.keys(folderObject).map(function(key) {
        var folder = folderObject[key];

        var node = {
            name: folder.name,
            value: folder.id
        };

        // if this folder has children, recursively process them
        if (folder.children && Object.keys(folder.children).length > 0) {
            node.children = formatForTreeselect(folder.children);
        }

        return node;
    });
}

function stBuildPageFoldersSelect(response) {
	if(response) {
		var folderSelect = $('.st-parent-folder-select');
		folderSelect.each(function () {
			var currentFolder = $(this);

			// clear the existing options
			currentFolder.empty();

			// add a blank option
			var blankOption = $('<option></option>')
				.attr('value', '')
				.attr('selected', 'selected')
				.text('- none -');
			currentFolder.append(blankOption);

			// loop through the folders and add them to the select
			if(Object.keys(response).length) {
				Object.keys(response).forEach(function(folder) {
					var curr_folder = response[folder];
					stAddFolderOptions(currentFolder, curr_folder);
				});
			}
		});
	}
}

function stAddFolderOptions(selectElement, folder, level = 0, parent = "") {

	// build the option element
	var option = $('<option></option>')
		.attr('value', folder.id)
		.attr('data-link', folder.link)
		.text(folder.name);

	// add the parent id if it exists
	if(parent != "") {
		option.data('parent', parent);
	}

	// add the option to the select element
	selectElement.append(option);

	// check for child folders
	if(folder.children && Object.keys(folder.children).length) {
		level++;

		// loop through the child folders
		Object.keys(folder.children).forEach(function(childKey) {
			stAddFolderOptions(selectElement, folder.children[childKey], level, folder.id);
		});
	}
}


var st_forms = {};

function stAjaxCall(a, d = {}, t = 'GET', alert = false) {

	// get the current page url
	var url = new URL(window.location.href);

	// get the i & w parameters from the url
	var i = url.searchParams.get('i');
	var w = url.searchParams.get('w');

	// get the root url
	url = url.origin + '/';

	// run the ajax call
	return new Promise((resolve, reject) => {
		$.ajax({
			url: url + 'process/vvveb.php',
			type: t,
			data: {
				i: i,
				w: w,
				a: a,
				d: JSON.stringify(d)
			},
			success: function(response) {

				// check if the response is valid JSON
				var r = response;
				if (typeof response === 'string') {
					try {
						r = JSON.parse(response);
					} catch (e) {
						console.error('Invalid JSON response:', response);
						reject();
						return;
					}
				}
				resolve(r);
			},
			error: function(response) {
				console.error('Ajax call failed:', a);
				if(alert) {

					// check if the response is valid JSON
					var r = (response.responseJson && typeof response.responseJSON === 'object') ? response.responseJSON : response.responseText;
					var alert_message = 'An error occurred while processing your request.';
					if (typeof r === 'string') {
						try {
							r = JSON.parse(r);
							if(r && r.message) {
								alert_message = r.message;
							}
							if(r && r.errors) {
								alert_message += '\n\n' + r.errors.join('\n');
							}
						} catch (e) {
							console.error('Invalid JSON response:', r);
						}
					}
					displayToast("bg-danger", "Error", alert_message);
				}
				reject();
			}
		});
	});
}

var mediaPath = "/media/";
var docinc = "";
var doclink = window.location.href;
var mediaScanUrl = "scan.php";
var uploadUrl = "upload.php";
var website_url = "";
stAjaxCall('getFilePath', [], 'GET').then(async (response) => {
	if(response.docinc) {
		docinc = response.docinc;
		mediaPath = docinc.replace(/^.*?\/public\//, '../../');
		if(response.doclink) {
			doclink = response.doclink;
		}
	}

	// check for a page link
	if(response.website_url) {
		website_url = response.website_url;
	}
});

function stGetPages(type = 'page') {
	let pages = {};

	// hide the #select-actions element
	$('#select-actions').hide();

	stAjaxCall('getPages', {type: type}, 'GET').then(async (response) => {

		Vvveb.Gui.init();
		Vvveb.FileManager.init();
		Vvveb.SectionList.init();
		Vvveb.TreeList.init();
		Vvveb.Breadcrumb.init();
		Vvveb.CssEditor.init();

		// build the folders in the file manager
		if(response && response.folders) {
			Object.keys(response.folders).forEach(function(folder) {
				var curr_folder = response.folders[folder];
				stAddFolder(curr_folder);
			});
		}

		// build the pages object from the response
		if(response && response.pages) {
			response.pages.forEach(function (page) {
				if(
					(page.url == undefined
						|| page.url == null
						|| page.url == ''
					)
					&& page.title == "Home"
				) {
					page.url = "/";
				}
				if (page.title && page.url && page.id) {
					pages[page.title] = {
						id: page.id,
						name: page.title,
						file: page.url,
						title: page.title,
						url: page.url,
						folder: page.folder || null,
						description: page.description || '',
						type: page.type || 'page',
						full_url: page.full_url || ''
					};
				}
			});
		}

		let firstPage = Object.keys(pages)[0];
		if(firstPage) {
			Vvveb.Builder.init(pages[firstPage]["url"], function () {});
		} else {
			Vvveb.Builder.init("", function () {});
		}

		Vvveb.FileManager.addPages(pages);
		Vvveb.Builder.loadSplashscreen();
		// Vvveb.FileManager.loadPage(pages[firstPage]["name"]);
		// Vvveb.Gui.toggleRightColumn(false);
		Vvveb.Breadcrumb.init();
	});
}

function stAddFolder(folder, parent = "") {

	// add the parent folder
	Vvveb.FileManager.addFolder(folder.name, folder.id, parent);

	// check for any children
	if(folder.children) {
		Object.keys(folder.children).forEach(function(childKey) {
			var child_folder = folder.children[childKey];
			stAddFolder(child_folder, folder.id);
		});
	}
}

window.stElementHighlightConfig = window.stElementHighlightConfig || {
	items: [
		{
			selector: "nav",
			label: "Navigation",
			color: "#de750c20",
			borderColor: "#de750c",
			labelTextColor: "#ffffff",
			labelBgColor: "#de750c"
		},
		{
			selector: "img",
			label: "Image",
			color: "rgba(14, 165, 233, 0.20)",
			borderColor: "#0284c7"
		},
		{
			selector: ".st-website-block",
			label: "Website Block",
			color: "rgba(14, 165, 233, 0.20)",
			borderColor: "#515151",
			labelTextColor: "#ffffff",
			labelBgColor: "#515151d3"
		},
		{
			selector: "a",
			label: "Link",
			color: "rgba(14, 165, 233, 0.20)",
			borderColor: "#515151",
			labelTextColor: "#ffffff",
			labelBgColor: "#515151d3"
		},
	],
	defaultColor: "rgba(249, 115, 22, 0.20)",
	defaultBorderColor: "#ea580c",
	defaultLabelTextColor: "#ffffff",
	defaultLabelBgColor: "rgba(15, 23, 42, 0.90)"
};

if (Array.isArray(window.stElementHighlightConfig.items)) {
	window.stElementHighlightConfig.items = window.stElementHighlightConfig.items.map(function(item) {
		let nextItem = { ...item };
		if (typeof nextItem.enabled === "undefined") {
			nextItem.enabled = true;
		}
		return nextItem;
	});
}

Vvveb.ElementHighlighter = {
	enabled: false,
	renderRaf: null,
	renderRafWindow: null,
	renderDebounceTimer: null,
	renderDebounceDelay: 40,
	hideMenuTimer: null,
	menuElement: null,
	isRendering: false,
	storageKey: "st.vvveb.elementHighlighter.state",
	styleId: "st-vvveb-element-highlight-style",
	overlayClass: "st-vvveb-highlight-overlay",
	labelClass: "st-vvveb-highlight-label",
	menuId: "st-element-highlight-menu",
	boundFrameWindow: null,

	init: function() {
		let self = this;

		if (self.isInitialised) {
			return;
		}

		self.isInitialised = true;
		self.loadState();
		self.initToggleMenu();
		self.syncButtonState();

		window.addEventListener("vvveb.iframe.loaded", function() {
			self.cancelPendingRender();
			self.bindFrameListeners();
			if (self.enabled) {
				self.requestRender();
			}
		});

		window.addEventListener("vvveb.getHtml.before", function() {
			self.clear();
		});

		window.addEventListener("vvveb.getHtml.after", function() {
			if (self.enabled) {
				self.requestRender();
			}
		});
	},

	bindFrameListeners: function() {
		let self = this;
		let frameWindow = window.FrameWindow;
		let frameDoc = window.FrameDocument;

		if (!frameWindow || !frameDoc || !frameDoc.body) {
			return;
		}

		if (self.boundFrameWindow !== frameWindow) {
			self.boundFrameWindow = frameWindow;

			frameWindow.addEventListener("scroll", function() {
				if (self.enabled) {
					self.requestRender();
				}
			});

			frameWindow.addEventListener("resize", function() {
				if (self.enabled) {
					self.requestRender();
				}
			});
		}

		if (self.observer) {
			self.observer.disconnect();
		}

		self.observer = new MutationObserver(function() {
			if (self.isRendering) {
				return;
			}

			if (self.enabled) {
				self.requestRender();
			}
		});

		self.observer.observe(frameDoc.body, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["class", "style"]
		});
	},

	getItems: function() {
		let config = window.stElementHighlightConfig || {};
		let items = Array.isArray(config.items) ? config.items : [];

		return items.filter(function(item) {
			return item
				&& typeof item.selector === "string"
				&& item.selector.trim() !== ""
				&& item.enabled !== false;
		});
	},

	getConfigItems: function() {
		let config = window.stElementHighlightConfig || {};
		let items = Array.isArray(config.items) ? config.items : [];

		return items.filter(function(item) {
			return item && typeof item.selector === "string" && item.selector.trim() !== "";
		});
	},

	setItems: function(items) {
		if (!Array.isArray(items)) {
			return;
		}

		window.stElementHighlightConfig = window.stElementHighlightConfig || {};
		window.stElementHighlightConfig.items = items.map(function(item) {
			let nextItem = { ...item };
			if (typeof nextItem.enabled === "undefined") {
				nextItem.enabled = true;
			}
			return nextItem;
		});

		this.renderToggleMenu();
		this.saveState();

		if (this.enabled) {
			this.requestRender();
		}
	},

	loadState: function() {
		let rawState = null;

		try {
			rawState = window.localStorage.getItem(this.storageKey);
		} catch (error) {
			return;
		}

		if (!rawState) {
			return;
		}

		let state = null;
		try {
			state = JSON.parse(rawState);
		} catch (error) {
			return;
		}

		if (!state || typeof state !== "object") {
			return;
		}

		if (typeof state.enabled === "boolean") {
			this.enabled = state.enabled;
		}

		let config = window.stElementHighlightConfig || {};
		if (!Array.isArray(config.items)) {
			return;
		}

		let enabledMap = (state.items && typeof state.items === "object") ? state.items : {};
		config.items = config.items.map(function(item) {
			let nextItem = { ...item };
			let key = (nextItem.selector || "") + "::" + (nextItem.label || "");
			if (Object.prototype.hasOwnProperty.call(enabledMap, key)) {
				nextItem.enabled = !!enabledMap[key];
			}
			return nextItem;
		});
	},

	saveState: function() {
		let config = window.stElementHighlightConfig || {};
		let items = Array.isArray(config.items) ? config.items : [];
		let persistedItems = {};

		items.forEach(function(item) {
			if (!item || typeof item.selector !== "string") {
				return;
			}

			let key = item.selector + "::" + (item.label || "");
			persistedItems[key] = (item.enabled !== false);
		});

		let state = {
			enabled: this.enabled,
			items: persistedItems
		};

		try {
			window.localStorage.setItem(this.storageKey, JSON.stringify(state));
		} catch (error) {
			return;
		}
	},

	initToggleMenu: function() {
		let self = this;
		let button = document.getElementById("toggle-element-highlight-btn");

		if (!button || self.menuElement) {
			return;
		}

		let menu = document.createElement("div");
		menu.id = self.menuId;
		menu.className = "dropdown-menu";
		menu.style.position = "fixed";
		menu.style.zIndex = "2000";
		menu.style.minWidth = "240px";
		menu.style.maxWidth = "320px";
		menu.style.maxHeight = "280px";
		menu.style.overflow = "auto";
		menu.style.display = "none";

		document.body.appendChild(menu);
		self.menuElement = menu;
		self.renderToggleMenu();

		let showMenu = function() {
			self.clearMenuHideTimer();
			self.renderToggleMenu();
			self.positionToggleMenu();
			menu.style.display = "block";
			menu.classList.add("show");
		};

		let hideMenu = function() {
			self.clearMenuHideTimer();
			self.hideMenuTimer = window.setTimeout(function() {
				menu.classList.remove("show");
				menu.style.display = "none";
			}, 140);
		};

		button.addEventListener("mouseenter", showMenu);
		button.addEventListener("mouseleave", hideMenu);
		button.addEventListener("click", function() {
			self.hideToggleMenu();
		});

		menu.addEventListener("mouseenter", function() {
			self.clearMenuHideTimer();
		});
		menu.addEventListener("mouseleave", hideMenu);

		window.addEventListener("resize", function() {
			if (menu.classList.contains("show")) {
				self.positionToggleMenu();
			}
		});
	},

	renderToggleMenu: function() {
		let self = this;
		let menu = self.menuElement;
		if (!menu) {
			return;
		}

		let items = self.getConfigItems();
		let html = "<div class='px-3 py-2 fw-semibold border-bottom'>Highlight Elements</div>";

		if (!items.length) {
			html += "<div class='px-3 py-2 text-muted small'>No highlight selectors configured.</div>";
			menu.innerHTML = html;
			return;
		}

		for (let i = 0; i < items.length; i++) {
			let item = items[i];
			let itemId = "st-highlight-toggle-" + i;
			let checked = (item.enabled !== false) ? "checked" : "";
			let label = item.label || item.selector;

			html += `
				<div class="form-check py-2 border-bottom" data-st-highlight-item-index="${i}" style="padding-left: 40px;">
					<input class="form-check-input" type="checkbox" value="1" id="${itemId}" ${checked}>
					<label class="form-check-label w-100" for="${itemId}" title="${item.selector}">
						${label}
					</label>
				</div>
			`;
		}

		menu.innerHTML = html;

		menu.querySelectorAll("[data-st-highlight-item-index]").forEach(function(wrapper) {
			let idx = Number(wrapper.getAttribute("data-st-highlight-item-index"));
			let input = wrapper.querySelector("input[type='checkbox']");

			if (!input || Number.isNaN(idx)) {
				return;
			}

			input.addEventListener("click", function(event) {
				event.stopPropagation();
			});

			input.addEventListener("change", function() {
				let config = window.stElementHighlightConfig || {};
				if (!Array.isArray(config.items) || !config.items[idx]) {
					return;
				}

				config.items[idx].enabled = input.checked;
				self.saveState();
				if (self.enabled) {
					self.requestRender();
				}
			});
		});
	},

	positionToggleMenu: function() {
		let button = document.getElementById("toggle-element-highlight-btn");
		let menu = this.menuElement;

		if (!button || !menu) {
			return;
		}

		let rect = button.getBoundingClientRect();
		let left = rect.left;
		let top = rect.bottom + 6;

		menu.style.left = left + "px";
		menu.style.top = top + "px";
	},

	clearMenuHideTimer: function() {
		if (!this.hideMenuTimer) {
			return;
		}

		window.clearTimeout(this.hideMenuTimer);
		this.hideMenuTimer = null;
	},

	hideToggleMenu: function() {
		if (!this.menuElement) {
			return;
		}

		this.clearMenuHideTimer();
		this.menuElement.classList.remove("show");
		this.menuElement.style.display = "none";
	},

	toggle: function(forceState = null) {
		let nextState = (typeof forceState === "boolean") ? forceState : !this.enabled;
		this.enabled = nextState;

		if (this.enabled) {
			this.requestRender();
		} else {
			this.clear();
		}

		this.saveState();
		this.syncButtonState();
	},

	syncButtonState: function() {
		let button = document.getElementById("toggle-element-highlight-btn");
		if (!button) {
			return;
		}

		if (this.enabled) {
			button.classList.add("active");
			button.setAttribute("aria-pressed", "true");
			button.setAttribute("title", "Hide element highlights");
		} else {
			button.classList.remove("active");
			button.setAttribute("aria-pressed", "false");
			button.setAttribute("title", "Show element highlights");
		}

		this.renderToggleMenu();
	},

	requestRender: function() {
		let self = this;

		if (self.renderDebounceTimer) {
			window.clearTimeout(self.renderDebounceTimer);
		}

		self.renderDebounceTimer = window.setTimeout(function() {
			self.renderDebounceTimer = null;
			self.queueAnimationRender();
		}, self.renderDebounceDelay);
	},

	queueAnimationRender: function() {
		let self = this;
		let frameWindow = window;

		if (self.renderRaf) {
			return;
		}

		self.renderRafWindow = frameWindow;
		self.renderRaf = frameWindow.requestAnimationFrame(function() {
			self.renderRaf = null;
			self.renderRafWindow = null;
			self.render();
		});
	},

	cancelPendingRender: function() {
		if (this.renderDebounceTimer) {
			window.clearTimeout(this.renderDebounceTimer);
			this.renderDebounceTimer = null;
		}

		if (!this.renderRaf || !this.renderRafWindow) {
			this.renderRaf = null;
			this.renderRafWindow = null;
			return;
		}

		this.renderRafWindow.cancelAnimationFrame(this.renderRaf);
		this.renderRaf = null;
		this.renderRafWindow = null;
	},

	ensureStyles: function(doc) {
		if (!doc || !doc.head || doc.getElementById(this.styleId)) {
			return;
		}

		let style = doc.createElement("style");
		style.id = this.styleId;
		style.textContent = `
			.${this.overlayClass} {
				position: absolute;
				box-sizing: border-box;
				pointer-events: none;
				box-shadow: 0 0 8px var(--st-highlight-border, #0284c7);
				border: 2px solid var(--st-highlight-border, #0284c7);
				background: var(--st-highlight-color, rgba(14, 165, 233, 0.20));
				z-index: 2147483000;
				border-radius: 3px;
			}

			.${this.overlayClass} .${this.labelClass} {
				position: absolute;
				right: 0;
				top: 0;
				transform: translateY(-100%);
				padding: 2px 8px;
				font-size: 11px;
				line-height: 1.4;
				color: var(--st-highlight-label-text, #ffffff);
				background: var(--st-highlight-label-bg, rgba(15, 23, 42, 0.90));
				white-space: nowrap;
				border-top-left-radius: 3px;
				border-top-right-radius: 3px;
			}
		`;

		doc.head.appendChild(style);
	},

	render: function() {
		let doc = window.FrameDocument;
		let frameWindow = window.FrameWindow;
		let config = window.stElementHighlightConfig || {};

		if (!this.enabled || !doc || !frameWindow || !doc.body) {
			return;
		}

		this.isRendering = true;

		try {
			this.clear();
			this.ensureStyles(doc);

			let items = this.getItems();
			if (!items.length) {
				return;
			}

			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let matches = [];

				try {
					matches = doc.querySelectorAll(item.selector);
				} catch (error) {
					continue;
				}
				let label = item.label || item.selector;
				let color = item.color || config.defaultColor || "rgba(14, 165, 233, 0.20)";
				let borderColor = item.borderColor || config.defaultBorderColor || "#0284c7";
				let labelTextColor = item.labelTextColor || config.defaultLabelTextColor || "#ffffff";
				let labelBgColor = item.labelBgColor || config.defaultLabelBgColor || "rgba(15, 23, 42, 0.90)";

				matches.forEach((element) => {
					let rect = element.getBoundingClientRect();
					if (rect.width <= 0 || rect.height <= 0) {
						return;
					}

					let overlay = doc.createElement("div");
					overlay.classList.add(this.overlayClass);
					overlay.setAttribute("data-st-highlight-overlay", "true");
					overlay.style.left = (rect.left + frameWindow.scrollX) + "px";
					overlay.style.top = (rect.top + frameWindow.scrollY) + "px";
					overlay.style.width = rect.width + "px";
					overlay.style.height = rect.height + "px";
					overlay.style.setProperty("--st-highlight-color", color);
					overlay.style.setProperty("--st-highlight-border", borderColor);
					overlay.style.setProperty("--st-highlight-label-text", labelTextColor);
					overlay.style.setProperty("--st-highlight-label-bg", labelBgColor);

					let labelEl = doc.createElement("span");
					labelEl.classList.add(this.labelClass);
					labelEl.textContent = label;
					overlay.appendChild(labelEl);

					doc.body.appendChild(overlay);
				});
			}
		} finally {
			this.isRendering = false;
		}
	},

	clear: function() {
		let doc = window.FrameDocument;
		if (!doc) {
			return;
		}

		doc.querySelectorAll("[data-st-highlight-overlay='true']").forEach(function(el) {
			el.remove();
		});
	}
};

if (Vvveb.Gui) {
	Vvveb.Gui.toggleElementHighlightOverlay = function() {
		Vvveb.ElementHighlighter.toggle();
	};
}

Vvveb.ElementHighlighter.init();