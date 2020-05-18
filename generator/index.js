const fs = require('fs');
const chalk = require('chalk');
const { EOL } = require('os');

module.exports = (api, options, rootOptions) => {

	// Add Vue Lang Router dependency
	api.extendPackage({
		dependencies: {
			'vue-lang-router': 'git+https://1b6b07f72b8d3d986102b0a4ee692021e23610ba:x-oauth-basic@github.com/radek-altof/vue-lang-router.git',
		},
	});

	api.onCreateComplete(() => {
		// Modify main.js file
		modifyMain(api);

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

	// Inject i18n to Vue options in main.js
	api.injectRootOptions(api.entryFile, 'i18n');
}

function warn (msg) {
	console.log(EOL + chalk.bgYellow.black(' WARN ') + ' ' + chalk.yellow(msg));
}

function standaloneImport (str, name) {
	const regExp = new RegExp(`^import {? *${name} *}? from .+$`, 'm');
	return str.match(regExp);
}

function nonStandaloneImport (str, name) {
	const regExp = new RegExp(`^import .*(( *, *${name})|(${name} *, *)|( *, *{ *${name} *})|({ *${name} *} *, *)).* from .+$`, 'm');
	return str.match(regExp);
}

function addImport(str, name, importLine) {

	// If there's a standalone import of "name", replace it
	if (standaloneImport(str, name) != null) {
		str = str.replace(standaloneImport(str, name)[0], importLine);
	}
	
	// If there's a non-standalone import, remove "name" from there and add a standalone import
	else if (nonStandaloneImport(str, name) != null) {
		const match = nonStandaloneImport(str, name);
		const index = match.index + match[0].indexOf(match[1]);
		str = str.substring(0, index) + str.substring(index + match[1].length);

		const imports = str.match(/^import.*$/gm);
		str = str.replace(imports[imports.length - 1], imports[imports.length - 1] + EOL + importLine);
	}

	// Otherwise just add a standalone import
	else {
		const imports = str.match(/^import.*$/gm);
		str = str.replace(imports[imports.length - 1], imports[imports.length - 1] + EOL + importLine);
	}

	return str;
}

function modifyMain(api) {
	// Determine extension
	const ext = api.hasPlugin('typescript') ? 'ts' : 'js';

	// Get path and file content
	const path = api.resolve(`./src/main.${ext}`);
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return warn('Main file not found, make sure to import i18n manually!');
	}

	// Add import i18n import line
	content = addImport(content, 'i18n', `import { i18n } from 'vue-lang-router'`);

	fs.writeFileSync(path, content, { encoding: 'utf-8' });
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
		return warn('Router file not found, make sure to add LangRouter manually.');
	}

	// Add LangRouter import line
	content = addImport(content, 'VueRouter', `import LangRouter from 'vue-lang-router'`);

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
		return warn('App.vue not found, skipping <router-link> replacement.');
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
		return warn('App.vue not found, skipping <language-switcher> example.');
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