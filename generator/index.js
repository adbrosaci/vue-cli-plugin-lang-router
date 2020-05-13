const fs = require('fs');
const chalk = require('chalk');

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

		// Replace <router-link> components with <localized-link>
		if (options.replaceRouterLink) replaceRouterLink(api);

		// Add <language-switcher> component
		if (options.addLanguageSwitcher) addLanguageSwitcher(api);
	});

	// Render the contents of template folder
	if (options.renderTemplate) {
		api.render('./template', {
			...options,
		});
	}
}

function modifyRouter (api) {
	// Determine extension
	const ext = api.hasPlugin('typescript') ? 'ts' : 'js';
	
	// Get path and file content
	const path = api.resolve(`./src/router/index.${ext}`);
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return console.log(chalk.red('\nRouter file not found, make sure to add LangRouter manually!'));
	}

	// Find the Vue Router import statement and replace it
	if (ext == 'ts') {
		content = content.replace(/import VueRouter, { RouteConfig } from 'vue-router'/, 'import { RouteConfig } from \'vue-router\'\nimport { LangRouter } from \'vue-lang-router\'');
	}
	else {
		content = content.replace(/import VueRouter from 'vue-router'/, 'import { LangRouter } from \'vue-lang-router\'');
	}

	// Find the Vue.use statement and replace it
	content = content.replace(/Vue.use\(VueRouter\)/, 'Vue.use(LangRouter)');

	// Find the new VueRouter statement and replace it
	content = content.replace(/new VueRouter/, 'new LangRouter');

	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}

function replaceRouterLink(api) {
	// Get path and file content
	const path = api.resolve('./src/App.vue');
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return console.log(chalk.red('\nApp.vue not found, skipping <router-link> replacement.'));
	}

	// Find the opening <router-link> tag and replace it
	content = content.replace(/<router-link/g, '<localized-link');

	// Find the closing </router-link> tag and replace it
	content = content.replace(/<\/router-link>/g, '<\/localized-link>');

	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}

function addLanguageSwitcher(api) {
	// Get path and file content
	const path = api.resolve('./src/App.vue');
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return console.log(chalk.red('\nApp.vue not found, skipping <language-switcher> example.'));
	}

	// The <language-switcher> template
	const languageSwitcher = `
	<language-switcher v-slot="{ links }">
		<router-link :to="link.url" v-for="link in links" :key="link.langIndex">
			<span>{{ link.langName }}</span>
		</router-link>
	</language-switcher>`;

	// Insert right after the beginning of <div id="nav">
	if (content.search(/<div.*id="nav".*>/) != -1) {
		content = content.replace(/<div.*id="nav".*>/, '$&' + languageSwitcher);
	}
	// Or insert right after the beginning the first <div> tag
	else {
		content = content.replace(/<div.*>/, '$&' + languageSwitcher);
	}
	
	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}