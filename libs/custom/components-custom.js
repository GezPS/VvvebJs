Vvveb.ComponentsGroup['Custom'] =
[];

ajaxCall("getComponents").then((components) => {
	console.debug('Components received:', components);
	processComponents(components);

	// we need to reload the control groups
	Vvveb.Builder.loadControlGroups();
});

function ajaxCall(a, d = {}) {

	// get the current page url
	var url = new URL(window.location.href);

	// get the i parameter from the url
	var i = url.searchParams.get('i');

	// get the root url
	url = url.origin + '/';

	// run the ajax call
	return new Promise((resolve, reject) => {
		$.ajax({
			url: url + 'process/vvveb.php',
			type: 'GET',
			data: {
				i: i,
				a: a,
				d: JSON.stringify(d)
			},
			success: function(response) {
				console.debug('Ajax call successful:', a, response);
				resolve(JSON.parse(response));
			},
			error: function() {
				console.error('Ajax call failed:', a);
				reject();
			}
		});
	});
}

function processComponents(components) {

	// check we have components
	if (components) {

		// loop through each component
		for (const key in components) {
			if (!components.hasOwnProperty(key)) continue;
			var component = components[key];
			if (component && component.name && component.html && component.type) {

				// set the properties
				var properties = component.properties || [];
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
	});
}

function componentInit(component, node) {

	// check the node has a data-id attribute
	var blockId = "";
	if ($(node).attr('data-id')) {
		blockId = $(node).attr('data-id');
	}

	// check for a block id
	if(blockId != "") {

		// get the block data
		ajaxCall("getWebsiteBlockSettings", {id: blockId}).then((response) => {

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
		ajaxCall("createWebsiteBlock", propertyValues).then((response) => {

			// check the response for an id
			if (response && response.id) {

				// update the node with the new id
				$(node).attr('data-id', response.id);

				// check for block data
				if(response.block) {

					var html = response.block.html || "";
					if(html != "") {

						// update the node's HTML
						$(node).html(html);

						// remove any classes from the node which are not in the component
						component.classes.forEach((className) => {
							if(!$(node).hasClass(className)) {
								$(node).addClass(className);
							}
						});
						var classes = node.classList;
						for (var i = 0; i < classes.length; i++) {
							if (!component.classes.includes(classes[i]) && classes[i] !== 'st-website-block') {
								$(node).removeClass(classes[i]);
							}
						}

						// update any other blocks with the same id
						component.classes.forEach((className) => {
							var elements = $(node).closest('html').find('.' + className + '[data-id="' + response.id + '"]');
							if(elements.length == 0) {
								console.debug('No elements found for class:', className, 'and data-id:', response.id);
							} else {
								elements.each(function() {
									console.debug($(this));
									if(this !== node
										&& this.parentElement !== node
									) {
										$(this).attr('data-id', response.id);
										$(this).html(html);
									}
								});
							}
						});
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