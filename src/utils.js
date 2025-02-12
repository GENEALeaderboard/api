export function toJSON(data, status = 200) {
	let body = JSON.stringify(data, null, 2);
	let headers = { 'content-type': 'application/json' };
	return new Response(body, { headers, status });
}
export function toError(error, status = 400) {
	return toJSON({ error }, status);
}
export function reply(output) {
	if (output != null)
		return toJSON(output, 200);
	return toError('Error with query', 500);
}

export function responseWithCORS(data) {
	const headers = new Headers({
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
		'Access-Control-Max-Age': '86400'
	});

	return new Response(JSON.stringify(data), { headers, status: 200 });
}

export function responseJSON(data) {
	const response = Response.json(data, {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
			'Access-Control-Max-Age': '86400'
		}
	});


	return response
}


export function responseError(data, status = 401) {
	const headers = new Headers({
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
		'Access-Control-Max-Age': '86400'
	});

	return new Response(JSON.stringify(data), { headers, status });
}

export function addCORS(response) {
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
	response.headers.set('Access-Control-Max-Age', '86400');

	return response
}
