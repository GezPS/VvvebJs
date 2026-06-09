$(document).ready(function () {

	// build the page folders on load
	stBuildPageFolders();

	// build the file manager nav items
	stBuildNavItems();

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
						type: page.type || 'page'
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