module.exports = (api, options, rootOptions) => {

	// Add Vue Lang Router dependency
	api.extendPackage({
		dependencies: {
			'vue-lang-router': 'git+https://1b6b07f72b8d3d986102b0a4ee692021e23610ba:x-oauth-basic@github.com/radek-altof/vue-lang-router.git',
		},
	});

	api.onCreateComplete(() => {
		// Modify router file
		modifyRouter(api);

		// Rewrite <router-link> components to <localized-link>
		if (options.rewriteRouterLink) rewriteRouterLink(api);
	});

	// Render the contents of template folder
	if (options.renderTemplate) {
		api.render('./template', {
			...options,
		});
	}
}

function modifyRouter (api) {
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

function rewriteRouterLink(api) {
	// Get filesystem
	const fs = require('fs');

	// Get path and file content
	const path = api.resolve('./src/App.vue');
	let content = fs.readFileSync(path, { encoding: 'utf-8' });

	// Find the opening <router-link> tag and replace it
	content = content.replace(/<router-link/g, '<localized-link');

	// Find the closing </router-link> tag and replace it
	content = content.replace(/<\/router-link>/g, '<\/localized-link>');

	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}