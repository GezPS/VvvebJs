$(document).ready(function () {
});

function stAjaxCall(a, d = {}, t = 'GET') {

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
			type: t,
			data: {
				i: i,
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
			error: function() {
				console.error('Ajax call failed:', a);
				reject();
			}
		});
	});
}