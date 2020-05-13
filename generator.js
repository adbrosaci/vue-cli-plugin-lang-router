module.exports = (api, options, rootOptions) => {

	// Add Vue Lang Router dependency
	api.extendPackage({
		dependencies: {
			'vue-lang-router': 'https://github.com/radek-altof/vue-lang-router.git',
		},
	});

	api.onCreateComplete(() => {
		// Modify router file
		modifyRouter();
	});
}

function modifyRouter () {
	// Get filesystem and determine extension
	const fs = require('fs');
	const ext = api.hasPlugin('typescript') ? 'ts' : 'js';

	// Get path and file content
	const path = api.resolve(`./src/router/index.${ext}`);
	let content = fs.readFileSync(path, { encoding: 'utf-8' });

	// Find the Vue Router import statement and replace it
	content = content.replace(/import VueRouter from 'vue-router'/, 'import { LangRouter } from \'vue-lang-router\'');

	// Find the Vue.use statement and replace it
	content = content.replace(/Vue.use\(VueRouter\)/, 'Vue.use(LangRouter)');

	// Find the new VueRouter statement and replace it
	content = content.replace(/new VueRouter/, 'new LangRouter');

	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}
